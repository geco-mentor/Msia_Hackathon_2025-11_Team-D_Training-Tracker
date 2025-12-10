import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import { testConnection } from './config/database';

// Load environment variables from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app: Application = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Raw request logger - BEFORE parsing
app.use((req: Request, res: Response, next: NextFunction) => {
    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(__dirname, '../../request_log.txt');
    const logEntry = `${new Date().toISOString()} - RAW ${req.method} ${req.path} - Content-Type: ${req.headers['content-type']} - Content-Length: ${req.headers['content-length']}\n`;
    try {
        fs.appendFileSync(logPath, logEntry);
    } catch (err) {
        console.error('Logging error:', err);
    }
    console.log(logEntry.trim());
    next();
});

// Middleware
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));

app.use(express.json());

// JSON Parse Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
        console.error('Bad JSON:', err);
        const fs = require('fs');
        const path = require('path');
        const debugPath = path.join(__dirname, '../../debug_log.txt');
        try {
            fs.appendFileSync(debugPath, `JSON Parse Error: ${err.message}\nRaw Body: ${err.body}\n`);
        } catch (e) {
            console.error('Failed to write debug log:', e);
        }
        return res.status(400).send({ status: 404, message: err.message }); // Bad request
    }
    next();
});

app.use(express.urlencoded({ extended: true }));

// Parsed request logger
app.use((req: Request, res: Response, next: NextFunction) => {
    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(__dirname, '../../request_log.txt');
    const logEntry = `${new Date().toISOString()} - PARSED ${req.method} ${req.path} - Body: ${JSON.stringify(req.body)}\n`;
    try {
        fs.appendFileSync(logPath, logEntry);
    } catch (err) {
        console.error('Logging error:', err);
    }
    next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

import employeeRoutes from './routes/employee';
import challengeRoutes from './routes/challenge';
import goalRoutes from './routes/goal';
import jobRoutes from './routes/job';

import analyticsRoutes from './routes/analytics';
import assessmentRoutes from './routes/assessment';
import ratingRoutes from './routes/rating';
import careerRoutes from './routes/career';
import certificationRoutes from './routes/certification';

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/certifications', certificationRoutes);

// 404 handler
// Serve static files from frontend/dist
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// Handle API 404s
app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'API Route not found'
    });
});

// SPA Fallback: Serve index.html for any other route
app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Server error:', err);
    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(__dirname, '../../error_log.txt');
    try {
        fs.appendFileSync(logPath, `${new Date().toISOString()} - ERROR: ${err.message}\n${err.stack}\n\n`);
    } catch (e) {
        console.error('Failed to write error log:', e);
    }
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const startServer = async () => {
    try {
        // Test database connection
        const isConnected = await testConnection();
        if (!isConnected) {
            console.error('❌ Failed to connect to database. Please check your SUPABASE_URL and SUPABASE_KEY.');
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.log('='.repeat(50));
            console.log('🚀 AI Training Tracker Backend Server');
            console.log('='.repeat(50));
            console.log(`📍 Server running on: http://localhost:${PORT}`);
            console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
            console.log(`📦 S3 Bucket: ${process.env.AWS_S3_BUCKET_NAME || '❌ NOT SET'}`);
            console.log(`Bn S3 Region: ${process.env.AWS_S3_REGION || '❌ NOT SET'}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log('='.repeat(50));
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;
