
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing creds'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log('=== Verifying Dashboard Metrics ===\n');

    // 1. Active Operatives
    const { count: empCount, error: empError } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });

    console.log(`1. Active Operatives (DB Count): ${empCount} (Dashboard says 54)`);

    // 2. Total Assessments
    const { count: assessCount, error: assessError } = await supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true });

    console.log(`2. Total Assessments (DB Count): ${assessCount} (Dashboard says 719)`);

    // 3. Avg. Completion Rate (Win Rate)
    const { data: employees } = await supabase.from('employees').select('win_rate');
    const totalWinRate = employees?.reduce((sum, emp) => sum + (emp.win_rate || 0), 0) || 0;
    // The controller multiplies by 100 implicitly if win_rate is 0.21, but let's check the raw values
    // Actually controller code: reduce sum + emp.win_rate / total. 
    // If win_rate is 0.21 stored as 0.21, then avg is 0.21. Dashboard shows 21%.
    const avgWinRate = employees && employees.length > 0 ? totalWinRate / employees.length : 0;
    console.log(`3. Avg Completion/Win Rate: ${(avgWinRate * 100).toFixed(1)}% (Dashboard says 21%)`);

    // 4. Training ROI
    // Logic: (Avg Post Score - Avg Pre Score) / Avg Pre Score * 100
    // Get Pre Assessments
    const { data: preData } = await supabase
        .from('pre_assessments')
        .select('baseline_score, scenario_id')
        .eq('completed', true);

    const { data: postData } = await supabase
        .from('assessments')
        .select('score, scenario_id')
        .eq('completed', true);

    // Group by scenario to match controller logic which calculates ROI per curriculum pair
    // Actually controller code:
    // preVsPostMap.forEach -> globalAvgPre = totalPreSum / pairCount
    // A pair is a "Scenario" that has BOTH pre and post data

    const preMap = new Map<string, { total: number, count: number }>();
    preData?.forEach(p => {
        const cur = preMap.get(p.scenario_id) || { total: 0, count: 0 };
        cur.total += p.baseline_score || 0;
        cur.count++;
        preMap.set(p.scenario_id, cur);
    });

    const postMap = new Map<string, { total: number, count: number }>();
    postData?.forEach(p => {
        const cur = postMap.get(p.scenario_id) || { total: 0, count: 0 };
        cur.total += p.score || 0;
        cur.count++;
        postMap.set(p.scenario_id, cur);
    });

    let totalPreAvg = 0;
    let totalPostAvg = 0;
    let pairs = 0;

    // Verify which scenario IDs link them
    preMap.forEach((pre, id) => {
        const post = postMap.get(id);
        if (post && post.count > 0 && pre.count > 0) {
            totalPreAvg += pre.total / pre.count;
            totalPostAvg += post.total / post.count;
            pairs++;
            // console.log(`Matched Scenario ${id}: Pre Avg ${(pre.total/pre.count).toFixed(1)}, Post Avg ${(post.total/post.count).toFixed(1)}`);
        }
    });

    const globalPre = pairs > 0 ? totalPreAvg / pairs : 0;
    const globalPost = pairs > 0 ? totalPostAvg / pairs : 0;

    console.log(`4. Training ROI Data:`);
    console.log(`   - Gloabl Avg Pre Score: ${globalPre.toFixed(2)}`);
    console.log(`   - Global Avg Post Score: ${globalPost.toFixed(2)}`);

    const roi = globalPre > 0 ? ((globalPost - globalPre) / globalPre) * 100 : 0;
    console.log(`   - Calculated ROI: +${Math.round(roi)}% (Dashboard says +236%)`);

})();
