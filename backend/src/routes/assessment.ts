import express from 'express';
import { getUploadUrl, processFile, getDepartments } from '../controllers/assessmentController';
import {
    handlePreAssessment,
    getPostAssessment,
    submitAssessment,
    startPreAssessment,
    submitFamiliarity,
    submitPreAssessmentAnswer,
    checkPreAssessmentStatus,
    checkPostAssessmentStatus,
    startPostAssessment,
    submitPostAssessmentAnswer,
    generateSelfAssessment
} from '../controllers/assessmentFlowController';

const router = express.Router();

router.post('/upload-url', getUploadUrl);
router.post('/process', processFile);
router.get('/departments', getDepartments);

// New Pre-Assessment Flow Routes
router.post('/pre-assessment/start', startPreAssessment);
router.post('/pre-assessment/familiarity', submitFamiliarity);
router.post('/pre-assessment/answer', submitPreAssessmentAnswer);
router.get('/pre-assessment/status/:userId/:scenarioId', checkPreAssessmentStatus);

// New Post-Assessment Flow Routes
router.get('/post-assessment/status/:userId/:scenarioId', checkPostAssessmentStatus);
router.post('/post-assessment/start', startPostAssessment);
router.post('/post-assessment/answer', submitPostAssessmentAnswer);

// Self-Assessment Route
router.post('/self-assessment/generate', generateSelfAssessment);

// Legacy Employee Flow Routes (keeping for backwards compatibility)
router.post('/pre-assessment', handlePreAssessment);
router.get('/post-assessment/:scenarioId', getPostAssessment);
router.post('/submit', submitAssessment);

export default router;


