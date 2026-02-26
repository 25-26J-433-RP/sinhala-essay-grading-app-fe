import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface EssayReportData {
  studentName?: string;
  studentId?: string;
  studentGrade?: number;
  essayTopic?: string;
  essayText: string;
  score?: number;
  scoreDetails?: {
    model?: string;
    dyslexic_flag?: boolean;
  };
  rubric?: {
    richness_5?: number;
    organization_6?: number;
    technical_3?: number;
    total_14?: number;
  };
  fairnessReport?: {
    original_richness_5?: number;
    adjusted_richness_5?: number;
    original_organization_6?: number;
    adjusted_organization_6?: number;
    original_technical_3?: number;
    adjusted_technical_3?: number;
    total_boost?: number;
    rubric_notes?: {
      theme_relevance?: number;
      theme_penalty?: number;
      word_count?: number;
      word_count_penalty?: number;
      technical_penalty?: number;
      technical_violations?: string[];
      grammar_issues?: string[];
    };
  };
  patternData?: {
    risk_level?: string;
    risk_score?: number;
    pattern_distribution?: Record<string, number>;
    dominant_pattern?: string;
  };
  audioFeedback?: string;
  timestamp?: string;
  language?: 'en' | 'si';
}

const translations: Record<string, Record<string, string>> = {
  en: {
    title: 'Essay Report',
    studentInfo: 'Student Information',
    studentName: 'Student Name',
    studentId: 'Student ID',
    grade: 'Grade',
    essayTopic: 'Essay Topic',
    essayText: 'Essay Text',
    scoringDetails: 'Scoring Details',
    score: 'Overall Score',
    model: 'Model Used',
    dyslexiaFlag: 'Dyslexia Detected',
    yes: 'Yes',
    no: 'No',
    rubricScores: 'Rubric Scores',
    richness: 'Richness',
    organization: 'Organization',
    technicalSkills: 'Technical Skills',
    totalScore: 'Total Score',
    fairnessReport: 'Fairness Report',
    original: 'Original',
    adjusted: 'Adjusted',
    boost: 'Total Boost',
    rubricNotes: 'Rubric Notes',
    themeRelevance: 'Theme Relevance',
    themePenalty: 'Theme Penalty',
    wordCount: 'Word Count',
    wordCountPenalty: 'Word Count Penalty',
    technicalPenalty: 'Technical Penalty',
    technicalViolations: 'Technical Violations',
    grammarIssues: 'Grammar Issues',
    patternAnalysis: 'Pattern Analysis',
    riskLevel: 'Risk Level',
    riskScore: 'Risk Score',
    dominantPattern: 'Dominant Pattern',
    patternDistribution: 'Pattern Distribution',
    audioFeedback: 'Audio Feedback',
    none: 'None',
    na: 'N/A',
  },
  si: {
    title: 'රචනා වාර්තාව',
    studentInfo: 'ශිෂ්‍ය තොරතුරු',
    studentName: 'ශිෂ්‍ය නම',
    studentId: 'ශිෂ්‍ය අංකය',
    grade: 'පංතිය',
    essayTopic: 'රචනා තේමාව',
    essayText: 'රචනා පෙළ',
    scoringDetails: 'ලකුණු තොරතුරු',
    score: 'සමස්ත ලකුණු',
    model: 'භාවිත ආකෘතිය',
    dyslexiaFlag: 'අකුරු අවබෝධන දුෂ්ටතා අනාවරණය',
    yes: 'ඔව්',
    no: 'නැත',
    rubricScores: 'නිර්ණය ලකුණු',
    richness: 'සමෘද්ධතාවය',
    organization: 'සංවිධාන',
    technicalSkills: 'තාක්ෂණික කුසලතා',
    totalScore: 'සමස්ත ලකුණු',
    fairnessReport: 'සාධාරණත්ව වාර්තාව',
    original: 'මුල',
    adjusted: 'සකස් කරන ලද',
    boost: 'සම්පූර්ණ උත්ප්‍රේරණය',
    rubricNotes: 'නිර්ණය සටහන්',
    themeRelevance: 'තේමා අදාළකම',
    themePenalty: 'තේමා දඩ',
    wordCount: 'වචන සංඛ්‍යාව',
    wordCountPenalty: 'වචන සංඛ්‍යා දඩ',
    technicalPenalty: 'තාක්ෂණික දඩ',
    technicalViolations: 'තාක්ෂණික උල්ලංඝනයන්',
    grammarIssues: 'ව්‍යාකරණ ගැටලු',
    patternAnalysis: 'ඩිස්ලෙක්සියා රටාවල විශ්ලේෂණ',
    riskLevel: 'අවදානම් මට්ටම',
    riskScore: 'අවදානම් ලකුණු',
    dominantPattern: 'සිටින රටාව',
    patternDistribution: 'රටා බෙදාහැරීම',
    audioFeedback: 'ශ්‍රව ප්‍රතිකර්ම',
    none: 'නැත',
    na: 'ලබා ගත නොහැක',
  },
};

function t(key: string, lang: 'en' | 'si' = 'en'): string {
  return translations[lang]?.[key] || key;
}

function generateHTML(data: EssayReportData): string {
  const lang = data.language || 'en';
  
  const bodyContent = `
      <h1>${t('title', lang)}</h1>
      
      <!-- Student Information -->
      <h2>${t('studentInfo', lang)}</h2>
      ${data.studentId ? `<div class="info-row"><div class="info-label">${t('studentId', lang)}:</div><div class="info-value">${data.studentId}</div></div>` : ''}
      ${data.studentGrade ? `<div class="info-row"><div class="info-label">${t('grade', lang)}:</div><div class="info-value">${data.studentGrade}</div></div>` : ''}
      ${data.essayTopic ? `<div class="info-row"><div class="info-label">${t('essayTopic', lang)}:</div><div class="info-value">${data.essayTopic}</div></div>` : ''}
      ${data.timestamp ? `<div class="info-row"><div class="info-label">Date:</div><div class="info-value">${data.timestamp}</div></div>` : ''}
      
      <!-- Scoring Details -->
      ${data.score !== undefined || data.scoreDetails ? `
        <h2>${t('scoringDetails', lang)}</h2>
        <div class="score-grid">
          ${data.score !== undefined ? `
            <div class="score-card">
              <div class="score-label">${t('score', lang)}</div>
              <div class="score-value">${typeof data.score === 'number' ? data.score.toFixed(2) : data.score}</div>
            </div>
          ` : ''}
          ${data.scoreDetails?.model ? `
            <div class="score-card">
              <div class="score-label">${t('model', lang)}</div>
              <div class="score-value" style="font-size: 14px;">${data.scoreDetails.model}</div>
            </div>
          ` : ''}
        </div>
        ${data.scoreDetails?.dyslexic_flag !== undefined ? `
          <div class="info-row">
            <div class="info-label">${t('dyslexiaFlag', lang)}:</div>
            <div class="info-value">
              ${data.scoreDetails.dyslexic_flag ? t('yes', lang) : t('no', lang)}
              <span class="badge ${data.scoreDetails.dyslexic_flag ? 'badge-warning' : 'badge-success'}">
                ${data.scoreDetails.dyslexic_flag ? '⚠️' : '✓'}
              </span>
            </div>
          </div>
        ` : ''}
      ` : ''}
      
      <!-- Rubric Scores -->
      ${data.rubric ? `
        <h2>${t('rubricScores', lang)}</h2>
        <div class="score-grid">
          ${data.rubric.richness_5 !== undefined ? `
            <div class="score-card">
              <div class="score-label">${t('richness', lang)}</div>
              <div class="score-value">${data.rubric.richness_5.toFixed(2)} / 5</div>
            </div>
          ` : ''}
          ${data.rubric.organization_6 !== undefined ? `
            <div class="score-card">
              <div class="score-label">${t('organization', lang)}</div>
              <div class="score-value">${data.rubric.organization_6.toFixed(2)} / 6</div>
            </div>
          ` : ''}
          ${data.rubric.technical_3 !== undefined ? `
            <div class="score-card">
              <div class="score-label">${t('technicalSkills', lang)}</div>
              <div class="score-value">${data.rubric.technical_3.toFixed(2)} / 3</div>
            </div>
          ` : ''}
          ${data.rubric.total_14 !== undefined ? `
            <div class="score-card">
              <div class="score-label">${t('totalScore', lang)}</div>
              <div class="score-value">${data.rubric.total_14.toFixed(2)} / 14</div>
            </div>
          ` : ''}
        </div>
      ` : ''}
      
      <!-- Fairness Report -->
      ${data.fairnessReport && data.scoreDetails?.dyslexic_flag ? `
        <h2>${t('fairnessReport', lang)}</h2>
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>${t('original', lang)}</th>
              <th>${t('adjusted', lang)}</th>
            </tr>
          </thead>
          <tbody>
            ${data.fairnessReport.original_richness_5 !== undefined ? `
              <tr>
                <td>${t('richness', lang)}</td>
                <td>${data.fairnessReport.original_richness_5.toFixed(2)}</td>
                <td><strong>${data.fairnessReport.adjusted_richness_5?.toFixed(2)}</strong></td>
              </tr>
            ` : ''}
            ${data.fairnessReport.original_organization_6 !== undefined ? `
              <tr>
                <td>${t('organization', lang)}</td>
                <td>${data.fairnessReport.original_organization_6.toFixed(2)}</td>
                <td><strong>${data.fairnessReport.adjusted_organization_6?.toFixed(2)}</strong></td>
              </tr>
            ` : ''}
            ${data.fairnessReport.original_technical_3 !== undefined ? `
              <tr>
                <td>${t('technicalSkills', lang)}</td>
                <td>${data.fairnessReport.original_technical_3.toFixed(2)}</td>
                <td><strong>${data.fairnessReport.adjusted_technical_3?.toFixed(2)}</strong></td>
              </tr>
            ` : ''}
          </tbody>
        </table>
        ${data.fairnessReport.total_boost !== undefined ? `
          <div class="info-row">
            <div class="info-label">${t('boost', lang)}:</div>
            <div class="info-value"><strong>+${data.fairnessReport.total_boost.toFixed(2)}</strong></div>
          </div>
        ` : ''}
        
        <!-- Rubric Notes -->
        ${data.fairnessReport.rubric_notes ? `
          <h2 style="font-size: 18px; margin-top: 20px;">${t('rubricNotes', lang)}</h2>
          ${data.fairnessReport.rubric_notes.theme_relevance !== undefined ? `
            <div class="info-row">
              <div class="info-label">${t('themeRelevance', lang)}:</div>
              <div class="info-value">${data.fairnessReport.rubric_notes.theme_relevance.toFixed(2)}</div>
            </div>
          ` : ''}
          ${data.fairnessReport.rubric_notes.theme_penalty !== undefined ? `
            <div class="info-row">
              <div class="info-label">${t('themePenalty', lang)}:</div>
              <div class="info-value">${data.fairnessReport.rubric_notes.theme_penalty.toFixed(2)}</div>
            </div>
          ` : ''}
          ${data.fairnessReport.rubric_notes.word_count !== undefined ? `
            <div class="info-row">
              <div class="info-label">${t('wordCount', lang)}:</div>
              <div class="info-value">${data.fairnessReport.rubric_notes.word_count}</div>
            </div>
          ` : ''}
          ${data.fairnessReport.rubric_notes.word_count_penalty !== undefined ? `
            <div class="info-row">
              <div class="info-label">${t('wordCountPenalty', lang)}:</div>
              <div class="info-value">${data.fairnessReport.rubric_notes.word_count_penalty.toFixed(2)}</div>
            </div>
          ` : ''}
          ${data.fairnessReport.rubric_notes.technical_penalty !== undefined ? `
            <div class="info-row">
              <div class="info-label">${t('technicalPenalty', lang)}:</div>
              <div class="info-value">${data.fairnessReport.rubric_notes.technical_penalty.toFixed(2)}</div>
            </div>
          ` : ''}
          ${data.fairnessReport.rubric_notes.technical_violations && data.fairnessReport.rubric_notes.technical_violations.length > 0 ? `
            <div style="margin-top: 12px;">
              <div class="info-label" style="margin-bottom: 6px;">${t('technicalViolations', lang)}:</div>
              ${data.fairnessReport.rubric_notes.technical_violations.map(v => `<div class="list-item">${v}</div>`).join('')}
            </div>
          ` : ''}
          ${data.fairnessReport.rubric_notes.grammar_issues && data.fairnessReport.rubric_notes.grammar_issues.length > 0 ? `
            <div style="margin-top: 12px;">
              <div class="info-label" style="margin-bottom: 6px;">${t('grammarIssues', lang)}:</div>
              ${data.fairnessReport.rubric_notes.grammar_issues.map(v => `<div class="list-item">${v}</div>`).join('')}
            </div>
          ` : ''}
        ` : ''}
      ` : ''}
      
      <!-- Pattern Analysis -->
      ${data.patternData ? `
        <h2>${t('patternAnalysis', lang)}</h2>
        ${data.patternData.risk_level ? `
          <div class="info-row">
            <div class="info-label">${t('riskLevel', lang)}:</div>
            <div class="info-value">
              ${data.patternData.risk_level}
              <span class="badge ${
                data.patternData.risk_level.includes('High') ? 'badge-danger' :
                data.patternData.risk_level.includes('Moderate') ? 'badge-warning' : 'badge-success'
              }">
                ${data.patternData.risk_level.includes('High') ? '⚠️' : data.patternData.risk_level.includes('Moderate') ? '⚠' : '✓'}
              </span>
            </div>
          </div>
        ` : ''}
        ${data.patternData.risk_score !== undefined ? `
          <div class="info-row">
            <div class="info-label">${t('riskScore', lang)}:</div>
            <div class="info-value"><strong>${data.patternData.risk_score.toFixed(1)}%</strong></div>
          </div>
        ` : ''}
        ${data.patternData.dominant_pattern ? `
          <div class="info-row">
            <div class="info-label">${t('dominantPattern', lang)}:</div>
            <div class="info-value">${data.patternData.dominant_pattern}</div>
          </div>
        ` : ''}
        ${data.patternData.pattern_distribution ? `
          <div style="margin-top: 16px;">
            <div class="info-label" style="margin-bottom: 10px;">${t('patternDistribution', lang)}:</div>
            ${Object.entries(data.patternData.pattern_distribution).map(([pattern, percentage]) => `
              <div class="pattern-item">
                <span class="pattern-name">${pattern}</span>
                <span class="pattern-value">${typeof percentage === 'number' ? (percentage * 100).toFixed(1) : percentage}%</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      ` : ''}
  `;
  
  return bodyContent;
}

function downloadFileWeb(content: string, filename: string, mimeType: string): void {
  try {
    // Check if document is available (web platform only)
    if (typeof document === 'undefined') {
      throw new Error('Document API not available on this platform');
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a') as HTMLAnchorElement;
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (err) {
    console.error('Error downloading on web:', err);
    throw err;
  }
}

export async function downloadEssayReportPDF(data: EssayReportData): Promise<void> {
  console.log('🚀 downloadEssayReportPDF called at:', new Date().toISOString());
  
  if (!data) {
    throw new Error('No report data provided');
  }
  
  console.log('📋 Data received:', {
    studentId: data.studentId,
    score: data.score,
    language: data.language,
    hasRubric: !!data.rubric,
  });
  
  try {
    console.log('1️⃣ Generating HTML body content...');
    const bodyContent = generateHTML(data);
    
    if (!bodyContent) {
      throw new Error('Failed to generate HTML body content');
    }
    
    console.log('✅ HTML body generated, length:', bodyContent.length);
    console.log('📏 Body content preview:', bodyContent.substring(0, 100));
    
    const filename = `Essay_Report_${data.studentId || 'Student'}_${new Date().toISOString().split('T')[0]}`;
    console.log('2️⃣ Filename:', filename);
    console.log('3️⃣ Detecting platform...');
    console.log('Platform.OS value:', Platform.OS);
    
    // Determine if web or native
    const isWeb = Platform.OS === 'web';
    console.log(`4️⃣ Platform check - isWeb: ${isWeb}`);
    
    if (isWeb) {
      console.log('🌐🌐🌐 WEB PLATFORM DETECTED 🌐🌐🌐');
      const htmlDocument = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${filename}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      padding: 32px;
      color: #1f2937;
      line-height: 1.6;
      background: white;
    }
    h1 {
      color: #0066cc;
      font-size: 28px;
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 3px solid #0066cc;
    }
    h2 {
      color: #34d399;
      font-size: 20px;
      margin-top: 28px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #34d399;
    }
    .info-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-label {
      font-weight: 600;
      color: #4b5563;
      width: 180px;
      flex-shrink: 0;
    }
    .info-value {
      color: #1f2937;
      flex: 1;
    }
    .score-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin: 16px 0;
    }
    .score-card {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .score-label {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .score-value {
      font-size: 24px;
      font-weight: 700;
      color: #0066cc;
    }
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .comparison-table th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border: 1px solid #e5e7eb;
    }
    .comparison-table td {
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
    }
    .pattern-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f9fafb;
      margin: 6px 0;
      border-radius: 6px;
      border-left: 4px solid #6366f1;
    }
    .pattern-name {
      font-weight: 600;
      color: #374151;
    }
    .pattern-value {
      color: #6366f1;
      font-weight: 700;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 8px;
    }
    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    .badge-danger {
      background: #fee2e2;
      color: #991b1b;
    }
    .list-item {
      padding: 6px 0;
      padding-left: 20px;
      position: relative;
    }
    .list-item::before {
      content: "•";
      position: absolute;
      left: 8px;
      font-weight: bold;
      color: #6b7280;
    }
    @media print {
      body {
        padding: 16px;
      }
      h1 {
        font-size: 24px;
      }
      h2 {
        font-size: 18px;
        page-break-after: avoid;
      }
      .score-grid {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
      
      console.log('4️⃣ Creating HTML document blob...');
      try {
        downloadFileWeb(htmlDocument, `${filename}.html`, 'text/html');
        console.log('5️⃣✅ Web download file created and triggered');
      } catch (webError) {
        console.error('💥 Web download error:', webError);
        throw webError;
      }
    } else {
      // On native platforms, generate PDF and share
      console.log('📱📱📱 NATIVE PLATFORM DETECTED 📱📱📱');
      console.log('4️⃣ Building PDF HTML document...');
      const pdfHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
    h1 { color: #0066cc; font-size: 24px; margin: 16px 0 8px 0; }
    h2 { color: #34d399; font-size: 18px; margin: 16px 0 8px 0; }
    .info-row { padding: 6px 0; border-bottom: 1px solid #eee; }
    .info-label { font-weight: 600; display: inline-block; width: 150px; }
    .score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
    .score-card { background: #f5f5f5; padding: 12px; border-radius: 6px; }
    .score-value { font-size: 20px; font-weight: 700; color: #0066cc; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 6px; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-success { background: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
      
      console.log('5️⃣ Calling Print.printToFileAsync...');
      console.log('Print available?', !!Print);
      console.log('Print.printToFileAsync available?', typeof Print?.printToFileAsync);
      
      let pdfUri: string | null = null;
      
      try {
        const result = await Print.printToFileAsync({ html: pdfHtml });
        pdfUri = result?.uri;
        console.log('6️⃣ PDF generated at:', pdfUri);
        
        if (!pdfUri) {
          throw new Error('PDF generation did not return a URI');
        }
      } catch (printError: any) {
        console.error('💥 Print error:', printError);
        throw new Error(`PDF generation failed: ${printError?.message || 'Unknown error'}`);
      }
      
      console.log('7️⃣ Checking if sharing is available...');
      console.log('Sharing available?', !!Sharing);
      console.log('Sharing.isAvailableAsync available?', typeof Sharing?.isAvailableAsync);
      
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        console.log('8️⃣ Sharing available?', isAvailable);
        
        if (isAvailable && pdfUri) {
          console.log('9️⃣ Opening share dialog for:', pdfUri);
          await Sharing.shareAsync(pdfUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Essay Report',
            UTI: 'com.adobe.pdf',
          });
          console.log('🔟 Share dialog completed');
        } else {
          console.warn('⚠️ Sharing not available or no URI generated');
          throw new Error('Share dialog not available on this device');
        }
      } catch (sharingError: any) {
        console.error('💥 Sharing error:', sharingError);
        throw new Error(`Sharing failed: ${sharingError?.message || 'Unknown error'}`);
      }
    }
    console.log('✅✅✅ Download process completed successfully! ✅✅✅');
  } catch (error: any) {
    console.error('💥💥💥 CRITICAL ERROR IN DOWNLOAD 💥💥💥');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.code);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('Stack trace:', error?.stack);
    throw error;
  }
}

