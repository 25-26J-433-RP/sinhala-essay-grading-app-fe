import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export interface SimpleReportData {
  studentId?: string;
  studentGrade?: number;
  essayTopic?: string;
  essayImageUri?: string;
  score?: number;
  timestamp?: string;
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
  };
  patternData?: {
    risk_level?: string;
    risk_score?: number;
    dominant_pattern?: string;
    severity?: string;
    explanation?: string;
  };
  textFeedback?: {
    feedback?: string;
    suggestions?: string[];
    metrics?: {
      word_count?: number;
      sentence_count?: number;
      avg_sentence_length?: number;
      repetition_ratio?: number;
      duplicate_word_count?: number;
      char_length?: number;
    };
  };
}

/**
 * Generate a professional PDF report
 * Works on both web and native platforms
 */
export async function generateSimpleReport(data: SimpleReportData): Promise<void> {
  console.log('📋 generateSimpleReport called with data:', JSON.stringify(data, null, 2));
  console.log('🔍 Data check:');
  console.log('  score:', data.score, 'type:', typeof data.score);
  console.log('  rubric:', data.rubric);
  console.log('  fairnessReport:', data.fairnessReport);
  console.log('  patternData:', data.patternData);
  console.log('  textFeedback:', data.textFeedback);
  console.log('  textFeedback.feedback:', data.textFeedback?.feedback);
  console.log('  textFeedback.suggestions:', data.textFeedback?.suggestions);
  console.log('  textFeedback.metrics:', data.textFeedback?.metrics);
  
  try {
    // Build HTML content dynamically
    let contentHTML = '';

    // Student Info Section
    if (data.studentId) {
      contentHTML += `<div class="row"><div class="label">Student ID</div><div class="value">${data.studentId}</div></div>`;
    }
    if (data.studentGrade) {
      contentHTML += `<div class="row"><div class="label">Grade Level</div><div class="value">Grade ${data.studentGrade}</div></div>`;
    }
    
    // Essay Image Section
    if (data.essayImageUri) {
      contentHTML += `<div class="essay-image-section"><h3>Captured Essay</h3><img src="${data.essayImageUri}" alt="Essay" class="essay-image"></div>`;
    }

    // Overall Score Section
    if (data.score !== undefined) {
      contentHTML += `<div class="score-section"><h2>Overall Score</h2><div class="score-value">${data.score.toFixed(2)}</div></div>`;
    }

    // Dyslexia Flag
    if (data.scoreDetails?.dyslexic_flag) {
      contentHTML += `<div class="row"><div class="label">Dyslexia Detection</div><div class="value">Dyslexic Essay <span class="badge-warning">⚠️ DETECTED</span></div></div>`;
    }

    // Rubric Breakdown Section
    if (data.rubric) {
      contentHTML += '<div class="section-title">Rubric Breakdown</div><div class="rubric-grid">';
      if (data.rubric.richness_5 !== undefined) {
        contentHTML += `<div class="rubric-item"><div class="rubric-label">Richness & Depth</div><div class="rubric-value">${data.rubric.richness_5.toFixed(2)} / 5</div></div>`;
      }
      if (data.rubric.organization_6 !== undefined) {
        contentHTML += `<div class="rubric-item"><div class="rubric-label">Organization</div><div class="rubric-value">${data.rubric.organization_6.toFixed(2)} / 6</div></div>`;
      }
      if (data.rubric.technical_3 !== undefined) {
        contentHTML += `<div class="rubric-item"><div class="rubric-label">Technical Skills</div><div class="rubric-value">${data.rubric.technical_3.toFixed(2)} / 3</div></div>`;
      }
      if (data.rubric.total_14 !== undefined) {
        contentHTML += `<div class="rubric-item"><div class="rubric-label">Total Score</div><div class="rubric-value" style="color: #10B981;">${data.rubric.total_14.toFixed(2)} / 14</div></div>`;
      }
      contentHTML += '</div>';
    }

    // Pattern Analysis Section
    if (data.patternData) {
      contentHTML += '<div class="section-title">Pattern Analysis</div>';
      if (data.patternData.risk_level) {
        const badge = data.patternData.risk_level.includes('High') ? '<span class="badge-warning">⚠️</span>' : '<span class="badge-success">✓</span>';
        contentHTML += `<div class="row"><div class="label">Risk Level</div><div class="value">${data.patternData.risk_level} ${badge}</div></div>`;
      }
      if (data.patternData.risk_score !== undefined) {
        contentHTML += `<div class="row"><div class="label">Risk Score</div><div class="value"><strong>${data.patternData.risk_score.toFixed(1)}%</strong></div></div>`;
      }
      if (data.patternData.dominant_pattern) {
        contentHTML += `<div class="row"><div class="label">Dominant Pattern</div><div class="value">${data.patternData.dominant_pattern}</div></div>`;
      }
    }

    // Text Feedback Section
    console.log('📝 Checking textFeedback:', {
      hasTextFeedback: !!data.textFeedback,
      hasFeedbackProp: !!data.textFeedback?.feedback,
      feedbackLength: data.textFeedback?.feedback?.length,
      feedbackContent: data.textFeedback?.feedback,
      suggestionsCount: data.textFeedback?.suggestions?.length,
      fullTextFeedback: JSON.stringify(data.textFeedback),
    });
    
    // Display feedback regardless of structure
    if (data.textFeedback) {
      const feedbackText = data.textFeedback?.feedback || data.textFeedback?.toString?.() || 'No feedback text available';
      const suggestions = data.textFeedback?.suggestions || [];
      const metrics = data.textFeedback?.metrics;
      
      if (feedbackText && feedbackText !== 'No feedback text available') {
        console.log('✅ Adding Personal Feedback section to PDF');
        contentHTML += '<div class="section-title">Personal Feedback</div>';
        contentHTML += `<div class="feedback-box"><p>${feedbackText}</p></div>`;
        
        // Suggestions
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          console.log('✅ Adding suggestions:', suggestions.length);
          contentHTML += '<div class="suggestions-section"><h4>Suggestions for Improvement:</h4><ul>';
          suggestions.forEach((suggestion) => {
            contentHTML += `<li>${suggestion}</li>`;
          });
          contentHTML += '</ul></div>';
        }
        
        // Metrics
        if (metrics && typeof metrics === 'object') {
          console.log('✅ Adding metrics');
          const m = metrics;
          contentHTML += '<div class="metrics-grid">';
          if (m.word_count !== undefined) contentHTML += `<div class="metric-item"><div class="metric-label">Word Count</div><div class="metric-value">${m.word_count}</div></div>`;
          if (m.sentence_count !== undefined) contentHTML += `<div class="metric-item"><div class="metric-label">Sentences</div><div class="metric-value">${m.sentence_count}</div></div>`;
          if (m.avg_sentence_length !== undefined) contentHTML += `<div class="metric-item"><div class="metric-label">Avg Sentence Length</div><div class="metric-value">${m.avg_sentence_length.toFixed(1)}</div></div>`;
          if (m.duplicate_word_count !== undefined) contentHTML += `<div class="metric-item"><div class="metric-label">Duplicate Words</div><div class="metric-value">${m.duplicate_word_count}</div></div>`;
          contentHTML += '</div>';
        }
      } else {
        console.log('❌ NO Personal Feedback text to display');
      }
    } else {
      console.log('❌ NO textFeedback object provided');
    }

    // Timestamp
    if (data.timestamp) {
      contentHTML += `<div class="row"><div class="label">Generated</div><div class="value">${data.timestamp}</div></div>`;
    }

    // Build complete HTML document
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Essay Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: white;
      padding: 30px 25px;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #007AFF;
    }
    .header h1 {
      color: #007AFF;
      font-size: 26px;
      margin: 0;
      font-weight: 700;
    }
    .content {
      margin-bottom: 20px;
    }
    .row {
      display: flex;
      margin-bottom: 12px;
      padding: 12px 14px;
      background: #f5f5f5;
      border-radius: 6px;
      border-left: 4px solid #007AFF;
      font-size: 14px;
    }
    .label {
      font-weight: 600;
      color: #555;
      min-width: 130px;
      flex-shrink: 0;
    }
    .value {
      color: #333;
      flex: 1;
      word-break: break-word;
    }
    .score-section {
      background: linear-gradient(135deg, #007AFF 0%, #2563EB 100%);
      color: white;
      padding: 25px;
      border-radius: 10px;
      text-align: center;
      margin: 20px 0;
    }
    .score-section h2 {
      font-size: 13px;
      font-weight: 500;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    .score-value {
      font-size: 42px;
      font-weight: 900;
    }
    .rubric-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 15px 0;
    }
    .rubric-item {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 6px;
      border-left: 4px solid #2563EB;
    }
    .rubric-label {
      font-size: 11px;
      color: #666;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .rubric-value {
      font-size: 20px;
      font-weight: 900;
      color: #007AFF;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #007AFF;
      margin-top: 18px;
      margin-bottom: 12px;
      border-bottom: 2px solid #007AFF;
      padding-bottom: 8px;
    }
    .badge-warning {
      display: inline-block;
      background: #FEF3C7;
      color: #92400E;
      padding: 3px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      margin-left: 6px;
    }
    .badge-success {
      display: inline-block;
      background: #D1FAE5;
      color: #065F46;
      padding: 3px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      margin-left: 6px;
    }
    .essay-image-section {
      margin: 20px 0;
    }
    .essay-image-section h3 {
      font-size: 15px;
      font-weight: 700;
      color: #007AFF;
      margin-bottom: 12px;
      border-bottom: 2px solid #007AFF;
      padding-bottom: 8px;
    }
    .essay-image {
      max-width: 100%;
      height: auto;
      border: 1px solid #ddd;
      border-radius: 6px;
      display: block;
      margin: 12px auto;
      max-height: 500px;
    }
    .feedback-box {
      background: #f0f4ff;
      border-left: 4px solid #3B82F6;
      padding: 13px;
      border-radius: 6px;
      margin: 12px 0;
      line-height: 1.7;
      color: #1f2937;
      font-size: 14px;
    }
    .feedback-box p {
      margin: 0;
    }
    .suggestions-section {
      margin: 15px 0;
    }
    .suggestions-section h4 {
      font-size: 13px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .suggestions-section ul {
      margin: 0;
      padding-left: 18px;
    }
    .suggestions-section li {
      margin-bottom: 6px;
      color: #1f2937;
      line-height: 1.5;
      font-size: 13px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 12px 0;
    }
    .metric-item {
      background: #f9fafb;
      padding: 10px;
      border-radius: 5px;
      border-left: 3px solid #10B981;
    }
    .metric-label {
      font-size: 10px;
      color: #666;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .metric-value {
      font-size: 16px;
      font-weight: 900;
      color: #10B981;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 12px;
      font-weight: 600;
    }
    @page {
      @bottom-center {
        content: 'Page ' counter(page) ' of ' counter(pages);
        font-size: 12px;
        color: #666;
      }
      margin-top: 30px;
      margin-bottom: 40px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Essay Scoring Report</h1>
    </div>
    <div class="content">
      ${contentHTML}
    </div>
    <div class="footer">
      <p>This is an automated report</p>
    </div>
  </div>
</body>
</html>`;

    console.log('📄 HTML content generated');
    
    const filename = `Essay_Report_${data.studentId || 'Student'}_${Date.now()}`;
    
    if (Platform.OS === 'web') {
      // Web: Generate PDF using native browser print functionality
      console.log('🌐 Web platform - generating PDF');
      
      const element = document.createElement('iframe');
      element.srcdoc = htmlContent;
      element.style.display = 'none';
      document.body.appendChild(element);
      
      setTimeout(() => {
        element.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(element);
        }, 1000);
      }, 500);
      
      console.log('✅ Web PDF generation initiated');
    } else {
      // Native: Use expo-print to generate PDF
      console.log('📱 Native platform - using expo-print');
      
      try {
        console.log('🔄 Calling Print.printToFileAsync...');
        const { uri } = await Print.printToFileAsync({ 
          html: htmlContent,
          base64: false,
        });
        
        console.log('✅ PDF generated at:', uri);
        
        // Share the PDF
        const isAvailable = await Sharing.isAvailableAsync();
        console.log('📤 Sharing available?', isAvailable);
        
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Essay Report',
            UTI: 'com.adobe.pdf',
          });
          console.log('✅ Share dialog opened');
        } else {
          Alert.alert(
            'Report Ready',
            `PDF saved to:\n${uri}\n\nYou can share it from your Files app.`,
          );
        }
      } catch (printError: any) {
        console.error('❌ Print error:', printError);
        throw new Error(`PDF generation failed: ${printError?.message}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error generating report:', error?.message);
    throw error;
  }
}
