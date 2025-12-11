const userId = '574ac033-f54d-4516-b056-81b20edbbc4b';
const scenarioId = '156aa51b-1c43-4229-9f9f-6e0a4f2057e7';

async function testPostAssessment() {
    console.log('=== Starting Post-Assessment Test ===\n');
    const allQuestions = [];

    // Step 1: Start post-assessment
    console.log('1. Starting post-assessment...');
    const startResponse = await fetch('http://localhost:3001/api/assessments/post-assessment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, scenarioId })
    });

    if (!startResponse.ok) {
        console.error('Failed to start:', await startResponse.text());
        return;
    }

    const startData = await startResponse.json();
    console.log('✓ Assessment started! ID:', startData.assessmentId);
    console.log('  Q1:', startData.question);
    allQuestions.push(startData.question);

    if (startData.completed) {
        console.log('Already completed with score:', startData.score);
        return;
    }

    // Step 2: Submit answers for all questions
    let assessmentId = startData.assessmentId;
    let questionNumber = startData.questionNumber;
    let totalQuestions = startData.totalQuestions;

    while (questionNumber < totalQuestions) {
        const testAnswer = 'I would apply best practices by following the guidelines from the training, ensuring clear communication and proper documentation.';

        console.log(`\n2. Submitting answer for Q${questionNumber}...`);
        const answerResponse = await fetch('http://localhost:3001/api/assessments/post-assessment/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assessmentId, answer: testAnswer })
        });

        if (!answerResponse.ok) {
            console.error('Failed to submit answer:', await answerResponse.text());
            return;
        }

        const answerData = await answerResponse.json();

        if (answerData.completed) {
            console.log('\n=== ASSESSMENT COMPLETE ===');
            console.log('Final Score:', answerData.score);
            break;
        }

        console.log('✓ Answer submitted! Score:', answerData.runningScore);
        console.log('  Q' + answerData.questionNumber + ':', answerData.question);
        allQuestions.push(answerData.question);

        questionNumber = answerData.questionNumber;
    }

    // Check for duplicates
    console.log('\n=== QUESTION SUMMARY ===');
    allQuestions.forEach((q, i) => console.log(`Q${i + 1}: ${q.substring(0, 60)}...`));

    const uniqueQuestions = new Set(allQuestions);
    if (uniqueQuestions.size === allQuestions.length) {
        console.log('\n✓ SUCCESS: All', allQuestions.length, 'questions are UNIQUE!');
    } else {
        console.log('\n✗ WARNING: Found', allQuestions.length - uniqueQuestions.size, 'duplicate questions');
    }
}

testPostAssessment().catch(console.error);
