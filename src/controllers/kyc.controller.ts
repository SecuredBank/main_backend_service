import { Request, Response } from 'express';
import { KycService } from '../services/kyc.service';
import { uploadKycDocuments } from '../middlewares/file.middleware';

export class KycController {
    private kycService: KycService;

    constructor() {
        this.kycService = new KycService();
    }

    /**
     * Handle KYC document upload and verification request
     */
    public requestVerification = async (req: Request, res: Response) => {
        try {
            // Handle file upload using multer middleware
            uploadKycDocuments(req as any, res as any, async (err: any) => {
                if (err) {
                    return res.status(400).json({ 
                        success: false, 
                        message: err.message || 'Error uploading files' 
                    });
                }

                // Check if files were uploaded
                if (!req.files || 
                    !('nationalId' in req.files) || 
                    !('selfie' in req.files)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Both national ID and selfie are required'
                    });
                }

                const userId = (req as any).user.id; // Assuming user is authenticated
                const files = {
                    nationalId: req.files['nationalId'],
                    selfie: req.files['selfie']
                };

                // Process KYC verification
                const kycRecord = await this.kycService.requestKycVerification(userId, files);
                
                res.status(201).json({
                    success: true,
                    data: kycRecord,
                    message: 'KYC verification request submitted successfully'
                });
            });
        } catch (error: any) {
            console.error('KYC verification error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to process KYC verification'
            });
        }
    };

    /**
     * Get KYC status for the authenticated user
     */
    public getStatus = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id; // Assuming user is authenticated
            const status = await this.kycService.getKycStatus(userId);
            
            res.status(200).json({
                success: true,
                data: status
            });
        } catch (error: any) {
            console.error('Error getting KYC status:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get KYC status'
            });
        }
    };

    /**
     * Webhook endpoint for Onfido callbacks
     */
    public webhook = async (req: Request, res: Response) => {
        try {
            // Verify webhook signature (implement this based on Onfido's webhook security)
            // const signature = req.headers['x-sha2-signature'];
            // if (!this.verifyWebhookSignature(signature, req.body)) {
            //     return res.status(401).send('Invalid signature');
            // }

            // Process the webhook event
            await this.kycService.handleWebhook(req.body);
            
            // Send 200 OK to acknowledge receipt
            res.status(200).send('Webhook received');
        } catch (error) {
            console.error('Error processing webhook:', error);
            res.status(500).send('Error processing webhook');
        }
    };

    /**
     * Verify webhook signature (implement this based on Onfido's webhook security)
     */
    private verifyWebhookSignature(signature: string | undefined, payload: any): boolean {
        // Implement webhook signature verification
        // This is a placeholder - implement according to Onfido's documentation
        return true;
    }
}

export const kycController = new KycController();
