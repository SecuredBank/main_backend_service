import { PrismaClient, Status } from "@prisma/client";
import { client } from "../config/db";
import { CloudinaryService } from "./cloudinary.service";
import { Onfido, Region } from "@onfido/api"

export class KycService {
    private prisma: PrismaClient;
    private onfido: Onfido;

    constructor() {
        this.prisma = client as unknown as PrismaClient;
        this.onfido = new Onfido({
            apiToken: process.env.ONFIDO_API_TOKEN!,
            // Use Region.EU for EU data center, Region.US for US data center
            region: (process.env.ONFIDO_REGION as unknown as Region) || Region.EU,
        });
    }

    /**
     * Request KYC verification for a user
     */
    async requestKycVerification(
        userId: string, 
        files: { nationalId: Express.Multer.File[], selfie: Express.Multer.File[] }
    ) {
        let nationalIdUrl: string | undefined;
        let selfieUrl: string | undefined;

        try {
            // Check if user exists and doesn't have a pending or approved KYC
            const existingKyc = await this.prisma.kycDocs.findFirst({
                where: {
                    userId,
                    status: {
                        in: [Status.REQUESTED, Status.APPROVED]
                    }
                }
            });

            if (existingKyc) {
                throw new Error('KYC verification is already in progress or approved');
            }

            // Upload files to Cloudinary
            [nationalIdUrl, selfieUrl] = await Promise.all([
                CloudinaryService.uploadFile(files.nationalId[0].buffer, 'documents'),
                CloudinaryService.uploadFile(files.selfie[0].buffer, 'selfies')
            ]);

            // Create KYC record in database
            const kycRecord = await this.prisma.kycDocs.create({
                data: {
                    userId,
                    nationalIdUrl,
                    selfieUrl,
                    status: Status.REQUESTED
                }
            });

            // Submit to Onfido for verification
            await this.submitToOnfido(userId, kycRecord.id, {
                nationalId: files.nationalId[0],
                selfie: files.selfie[0]
            });

            return kycRecord;
        } catch (error: any) {
            // Clean up uploaded files if there was an error
            if (nationalIdUrl) {
                await CloudinaryService.deleteFile(CloudinaryService.getPublicIdFromUrl(nationalIdUrl));
            }
            if (selfieUrl) {
                await CloudinaryService.deleteFile(CloudinaryService.getPublicIdFromUrl(selfieUrl));
            }
            throw error;
        }
    }

    /**
     * Submit KYC documents to Onfido for verification
     */
    private async submitToOnfido(
        userId: string,
        kycId: string,
        files: { nationalId: Express.Multer.File, selfie: Express.Multer.File }
    ) {
        try {
            // 1. Create an applicant in Onfido
            const applicant = await this.onfido.applicant.create({
                firstName: 'First', // You should get this from user profile
                lastName: 'Last',  // You should get this from user profile
                email: 'user@example.com' // You should get this from user profile
            });

            // 2. Upload documents to Onfido
            const document = await this.onfido.document.upload(
                files.nationalId.buffer,
                {
                    type: 'national_identities_card', // or other document types
                    fileType: files.nationalId.mimetype.split('/')[1],
                    applicantId: applicant.id,
                }
            );

            // 3. Upload live photo (selfie)
            const livePhoto = await this.onfido.livePhoto.upload(
                files.selfie.buffer,
                {
                    applicantId: applicant.id,
                    fileType: files.selfie.mimetype.split('/')[1],
                }
            );

            // 4. Create a check in Onfido
            const check = await this.onfido.check.create({
                applicantId: applicant.id,
                reportNames: ['document', 'facial_similarity'],
            });

            // Update KYC record with Onfido references
            await this.prisma.kycDocs.update({
                where: { id: kycId },
                data: {
                    onfidoApplicantId: applicant.id,
                    onfidoCheckId: check.id,
                    status: Status.REQUESTED
                }
            });

        } catch (error) {
            console.error('Onfido submission error:', error);
            throw new Error('Failed to submit KYC documents for verification');
        }
    }

    /**
     * Check KYC status for a user
     */
    async getKycStatus(userId: string) {
        const kyc = await this.prisma.kycDocs.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        if (!kyc) {
            return { status: 'NOT_SUBMITTED' };
        }

        // If we have an Onfido check ID, get the latest status
        if (kyc.onfidoCheckId) {
            try {
                const check = await this.onfido.check.find(kyc.onfidoCheckId);
                return {
                    status: kyc.status,
                    onfidoStatus: check.status,
                    reports: check.reports?.map((r: { name: any; status: any; result: any; }) => ({
                        name: r.name,
                        status: r.status,
                        result: r.result,
                    })),
                };
            } catch (error) {
                console.error('Error fetching Onfido check status:', error);
            }
        }

        return { status: kyc.status };
    }

    /**
     * Webhook handler for Onfido callbacks
     */
    async handleWebhook(event: any) {
        try {
            const { resource_type, action, object } = event;

            if (resource_type === 'check' && action === 'check.completed') {
                const check = await this.onfido.check.find(object.id);
                
                // Update KYC status based on check result
                const status = check.status === 'complete' ? 
                    (check.result === 'clear' ? Status.APPROVED : Status.REJECTED) : 
                    Status.REQUESTED;

                await this.prisma.kycDocs.updateMany({
                    where: { onfidoCheckId: object.id },
                    data: { status }
                });

                // TODO: Notify user about KYC status update
            }
        } catch (error) {
            console.error('Error processing webhook:', error);
            throw error;
        }
    }
}