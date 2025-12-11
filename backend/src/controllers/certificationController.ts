import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { AuthRequest } from '../middleware/auth';

/**
 * Add a new certification (employee can add their own)
 */
export const addCertification = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { name, issuer, issueDate, expiryDate, credentialId, credentialUrl, description } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        if (!name) {
            res.status(400).json({ success: false, message: 'Certification name is required' });
            return;
        }

        const { data, error } = await supabase
            .from('employee_certifications')
            .insert({
                user_id: userId,
                name,
                issuer: issuer || null,
                issue_date: issueDate || null,
                expiry_date: expiryDate || null,
                credential_id: credentialId || null,
                credential_url: credentialUrl || null,
                description: description || null
            })
            .select()
            .single();

        if (error) throw error;

        console.log('Certification added:', { userId, name });
        res.status(201).json({
            success: true,
            message: 'Certification added successfully',
            data
        });

    } catch (error: any) {
        console.error('Error adding certification:', error);
        res.status(500).json({ success: false, message: 'Failed to add certification' });
    }
};

/**
 * Get all certifications for a user
 */
export const getUserCertifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const requesterId = req.user?.id;
        const requesterRole = req.user?.role;

        // Allow user to see their own or admin to see anyone's
        if (userId !== requesterId && requesterRole !== 'admin') {
            res.status(403).json({ success: false, message: 'Access denied' });
            return;
        }

        // Get manual certifications
        const { data: manualCerts, error: manualError } = await supabase
            .from('employee_certifications')
            .select('*')
            .eq('user_id', userId)
            .order('issue_date', { ascending: false });

        if (manualError) throw manualError;

        // Get certifications from completed assessments
        const { data: assessmentCerts, error: assessError } = await supabase
            .from('assessments')
            .select(`
                id,
                score,
                completed_at,
                scenarios (
                    title,
                    category,
                    skill
                )
            `)
            .eq('user_id', userId)
            .eq('completed', true)
            .order('completed_at', { ascending: false });

        if (assessError) throw assessError;

        // Format assessment certs
        const systemCerts = (assessmentCerts || []).map((a: any) => ({
            id: a.id,
            name: a.scenarios?.title || a.scenarios?.category || 'Training Assessment',
            issuer: 'GenAI CTF Academy',
            issueDate: a.completed_at,
            expiryDate: null,
            credentialId: a.id,
            credentialUrl: null,
            description: `Completed with score: ${a.score}%`,
            type: 'system',
            skill: a.scenarios?.skill
        }));

        // Format manual certs
        const formattedManualCerts = (manualCerts || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            issuer: c.issuer,
            issueDate: c.issue_date,
            expiryDate: c.expiry_date,
            credentialId: c.credential_id,
            credentialUrl: c.credential_url,
            description: c.description,
            type: 'manual'
        }));

        res.status(200).json({
            success: true,
            data: {
                manual: formattedManualCerts,
                system: systemCerts,
                total: formattedManualCerts.length + systemCerts.length
            }
        });

    } catch (error: any) {
        console.error('Error fetching certifications:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch certifications' });
    }
};

/**
 * Update a certification (only owner can update)
 */
export const updateCertification = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { certId } = req.params;
        const userId = req.user?.id;
        const { name, issuer, issueDate, expiryDate, credentialId, credentialUrl, description } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        // Verify ownership
        const { data: existing } = await supabase
            .from('employee_certifications')
            .select('user_id')
            .eq('id', certId)
            .single();

        if (!existing || existing.user_id !== userId) {
            res.status(403).json({ success: false, message: 'You can only update your own certifications' });
            return;
        }

        const { data, error } = await supabase
            .from('employee_certifications')
            .update({
                name,
                issuer,
                issue_date: issueDate,
                expiry_date: expiryDate,
                credential_id: credentialId,
                credential_url: credentialUrl,
                description
            })
            .eq('id', certId)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            message: 'Certification updated successfully',
            data
        });

    } catch (error: any) {
        console.error('Error updating certification:', error);
        res.status(500).json({ success: false, message: 'Failed to update certification' });
    }
};

/**
 * Delete a certification (only owner can delete)
 */
export const deleteCertification = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { certId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        // Verify ownership
        const { data: existing } = await supabase
            .from('employee_certifications')
            .select('user_id')
            .eq('id', certId)
            .single();

        if (!existing || existing.user_id !== userId) {
            res.status(403).json({ success: false, message: 'You can only delete your own certifications' });
            return;
        }

        const { error } = await supabase
            .from('employee_certifications')
            .delete()
            .eq('id', certId);

        if (error) throw error;

        res.status(200).json({
            success: true,
            message: 'Certification deleted successfully'
        });

    } catch (error: any) {
        console.error('Error deleting certification:', error);
        res.status(500).json({ success: false, message: 'Failed to delete certification' });
    }
};
