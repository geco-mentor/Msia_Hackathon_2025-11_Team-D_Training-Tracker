import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined in environment variables');
}

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        role: 'employee' | 'admin' | 'manager';
    };
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'No authentication token provided'
            });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as {
            id: string;
            username: string;
            role: 'employee' | 'admin' | 'manager';
        };

        console.log('Token verified for user:', decoded.username);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

export const requireRole = (role: 'employee' | 'admin') => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        if (req.user.role !== role) {
            res.status(403).json({
                success: false,
                message: `Access denied. ${role} role required.`
            });
            return;
        }

        next();
    };
};
