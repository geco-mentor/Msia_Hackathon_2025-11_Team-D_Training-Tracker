import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database';
import { RegisterRequestBody, LoginRequestBody, AuthResponse } from '../types';
import { AuthRequest } from '../middleware/auth';
import { model } from '../services/aiService';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
const SALT_ROUNDS = 10;

/**
 * Employee Registration
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, username, employee_id, password, job_title, department, job_description }: RegisterRequestBody = req.body;

        // Validate required fields
        if (!name || !username || !employee_id || !password || !job_title || !department) {
            res.status(400).json({
                success: false,
                message: 'All fields are required: name, username, employee_id, password, job_title, department'
            });
            return;
        }

        // Check password strength
        if (password.length < 8) {
            res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
            return;
        }

        // Check if username already exists
        const { data: existingUsername } = await supabase
            .from('employees')
            .select('username')
            .eq('username', username)
            .single();

        if (existingUsername) {
            res.status(409).json({
                success: false,
                message: 'Username already exists'
            });
            return;
        }

        // Check if employee_id already exists
        const { data: existingEmployeeId } = await supabase
            .from('employees')
            .select('employee_id')
            .eq('employee_id', employee_id)
            .single();

        if (existingEmployeeId) {
            res.status(409).json({
                success: false,
                message: 'Employee ID already exists'
            });
            return;
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Generate job description if not provided
        let finalJobDescription = job_description;
        if (!finalJobDescription || finalJobDescription.trim() === '') {
            console.log('[Register] Generating job description for:', job_title);
            try {
                const prompt = `Generate a professional job description (2-3 sentences) for the role: ${job_title}. Focus on typical responsibilities and required skills. Be concise and professional.`;
                console.log('[Register] Calling model.generateContent...');
                const result = await model.generateContent(prompt);
                console.log('[Register] model.generateContent returned');
                finalJobDescription = result.response.text();
                console.log('[Register] Generated job description:', finalJobDescription);
            } catch (aiError: any) {
                console.error('[Register] Failed to generate job description');
                console.error('[Register] Error name:', aiError?.name);
                console.error('[Register] Error message:', aiError?.message);
                console.error('[Register] Error stack:', aiError?.stack);
                // Use fallback description
                finalJobDescription = `Responsible for duties related to ${job_title} role.`;
                console.log('[Register] Using fallback job description:', finalJobDescription);
            }
        }

        // Create employee record
        const { data: newEmployee, error } = await supabase
            .from('employees')
            .insert({
                name,
                username,
                employee_id,
                password_hash,
                job_title,
                department,
                job_description: finalJobDescription,
                skills_profile: {},
                ranking: 0,
                win_rate: 0.0,
                streak: 0
            })
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create employee account',
                error: error.message
            });
            return;
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: newEmployee.id,
                username: newEmployee.username,
                role: 'employee'
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return success response (exclude password_hash)
        const response: AuthResponse = {
            success: true,
            message: 'Employee registered successfully',
            token,
            user: {
                id: newEmployee.id,
                name: newEmployee.name,
                username: newEmployee.username,
                role: 'employee',
                employee_id: newEmployee.employee_id,
                job_title: newEmployee.job_title,
                job_description: newEmployee.job_description,
                department: newEmployee.department,
                ranking: newEmployee.ranking,
                win_rate: newEmployee.win_rate,
                streak: newEmployee.streak

            }
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during registration'
        });
    }
};

/**
 * Universal Login (Employee or Admin)
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const debugPath = path.join(__dirname, '../../../debug_log.txt');
        try {
            fs.appendFileSync(debugPath, `\nLogin called at ${new Date().toISOString()}\n`);
        } catch (e) { console.error('Log error', e); }

        const { username, password }: LoginRequestBody = req.body;

        // Validate required fields
        if (!username || !password) {
            res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
            return;
        }

        // Try to find user in employees table first
        const { data: employee } = await supabase
            .from('employees')
            .select('*')
            .eq('username', username)
            .single();

        if (employee) {
            // Verify password
            const isPasswordValid = await bcrypt.compare(password, employee.password_hash);

            if (!isPasswordValid) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
                return;
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: employee.id,
                    username: employee.username,
                    role: 'employee'
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            const response: AuthResponse = {
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: employee.id,
                    name: employee.name,
                    username: employee.username,
                    role: 'employee',
                    employee_id: employee.employee_id,
                    job_title: employee.job_title,
                    ranking: employee.ranking,
                    win_rate: employee.win_rate,
                    streak: employee.streak
                }
            };

            res.status(200).json(response);
            return;
        }

        // Try to find user in admins table
        const { data: admin } = await supabase
            .from('admins')
            .select('*')
            .eq('username', username)
            .single();

        // Write debug info to file
        const debugPath2 = path.join(__dirname, '../../../debug_log.txt');

        const debugData = {
            timestamp: new Date().toISOString(),
            username,
            passwordType: typeof password,
            adminFound: !!admin,
            adminId: admin?.id,
            hashType: typeof admin?.password_hash,
            hashLen: admin?.password_hash?.length,
            hashPreview: admin?.password_hash ? admin.password_hash.substring(0, 10) : 'N/A'
        };

        try {
            fs.writeFileSync(debugPath2, JSON.stringify(debugData, null, 2));
        } catch (err) {
            console.error('Failed to write debug log:', err);
        }

        if (admin) {
            // Verify password
            const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

            if (!isPasswordValid) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
                return;
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: admin.id,
                    username: admin.username,
                    role: 'admin'
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            const response: AuthResponse = {
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: admin.id,
                    name: admin.name,
                    username: admin.username,
                    role: 'admin'
                }
            };

            res.status(200).json(response);
            return;
        }

        // User not found in either table
        res.status(401).json({
            success: false,
            message: 'Invalid username or password'
        });
    } catch (error: any) {
        console.error('Login error:', error);

        // Log error to file
        try {
            const debugPath = path.join(__dirname, '../../../debug_log.txt');
            fs.appendFileSync(debugPath, `\nError: ${error.message}\nStack: ${error.stack}`);
        } catch (err) {
            console.error('Failed to write error log:', err);
        }

        res.status(500).json({
            success: false,
            message: `Login Error: ${error.message}`,
            stack: error.stack
        });
    }
};

/**
 * Get Current User Profile
 * GET /api/auth/me
 */
export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
            return;
        }

        const { id, role } = req.user;

        if (role === 'employee') {
            const { data: employee, error } = await supabase
                .from('employees')
                .select('id, name, username, employee_id, job_title, ranking, win_rate, streak, skills_profile')
                .eq('id', id)
                .single();

            if (error || !employee) {
                res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                user: {
                    id: employee.id,
                    name: employee.name,
                    username: employee.username,
                    role: 'employee',
                    employee_id: employee.employee_id,
                    job_title: employee.job_title,
                    ranking: employee.ranking,
                    win_rate: employee.win_rate,
                    streak: employee.streak,
                    skills_profile: employee.skills_profile
                }
            });
        } else if (role === 'admin') {
            const { data: admin, error } = await supabase
                .from('admins')
                .select('id, name, username')
                .eq('id', id)
                .single();

            if (error || !admin) {
                res.status(404).json({
                    success: false,
                    message: 'Admin not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                user: {
                    id: admin.id,
                    name: admin.name,
                    username: admin.username,
                    role: 'admin'
                }
            });
        }
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
    // Since we're using JWT, logout is handled client-side by removing the token
    // This endpoint is here for consistency and future enhancements (e.g., token blacklisting)
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};
