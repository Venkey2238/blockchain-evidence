# Evidence Export/Download Feature

## Overview

The Evidence Export/Download feature provides secure, audited access to evidence files with automatic watermarking and comprehensive tracking. This feature ensures chain of custody is maintained while allowing authorized users to download evidence for legal proceedings, analysis, and reporting.

## Features

### 🔒 Security Features
- **Automatic Watermarking**: All downloads include user ID, timestamp, and case number
- **Role-Based Access**: Public viewers cannot download evidence
- **Audit Logging**: Complete tracking of who downloaded what and when
- **Rate Limiting**: 100 downloads per hour per user
- **Metadata Embedding**: Blockchain hash and chain of custody information included

### 📥 Download Options
- **Single File Download**: Download individual evidence files with watermarks
- **Bulk Export**: Export multiple files as ZIP archive with metadata
- **Format Support**: Images, PDFs, videos, and documents
- **Download History**: Track all download activities

## API Endpoints

### POST /api/evidence/:id/download
Download a single evidence file with watermark.

**Request Body:**
```json
{
  "userWallet": "0x1234567890abcdef1234567890abcdef12345678"
}
```

**Response:** Binary file with watermark applied

**Headers:**
- `Content-Type`: Original file MIME type
- `Content-Disposition`: Attachment with watermarked filename
- `X-Watermark-Applied`: "true"
- `X-Downloaded-By`: User wallet (truncated)

### POST /api/evidence/bulk-export
Export multiple evidence files as ZIP archive.

**Request Body:**
```json
{
  "evidenceIds": [1, 2, 3],
  "userWallet": "0x1234567890abcdef1234567890abcdef12345678"
}
```

**Response:** ZIP file containing:
- Watermarked evidence files
- `export_metadata.json` with blockchain verification data
- Chain of custody information

### GET /api/evidence/:id/download-history
Get download history for specific evidence (Admin/Auditor only).

**Query Parameters:**
- `userWallet`: Admin or auditor wallet address

**Response:**
```json
{
  "success": true,
  "evidence_id": 1,
  "download_history": [
    {
      "timestamp": "2024-01-20T10:30:00Z",
      "user_id": "0x1234...5678",
      "action": "evidence_download",
      "details": {
        "evidence_id": 1,
        "evidence_name": "Crime Scene Photo",
        "watermark_applied": true
      }
    }
  ]
}
```

## Frontend Integration

### Using the Evidence Export Page
1. Navigate to `/evidence-export.html`
2. Select evidence files using checkboxes
3. Click "Download Selected File" for single download
4. Click "Export as ZIP Archive" for bulk export
5. View download history (if authorized)

### Using the JavaScript Module
```javascript
// Initialize exporter
const exporter = new EvidenceExporter(userWalletAddress);

// Download single file
await exporter.downloadSingle(evidenceId);

// Bulk export
await exporter.bulkExport([1, 2, 3]);

// Check permissions
const canDownload = await exporter.checkDownloadPermission();

// Add to existing table
exporter.enhanceEvidenceTable('#evidenceTable', 'data-evidence-id');
```

## Watermarking Details

### Image Watermarking
- Overlay text in bottom-left corner
- Semi-transparent white text with black stroke
- Contains: User ID (truncated) | Case Number | Timestamp

### PDF Watermarking
- Footer text on each page
- Gray color, small font size
- Contains: User ID (truncated) | Case Number | Timestamp

### Video Watermarking
- Burned-in subtitle watermark (planned)
- Bottom overlay with transparency
- Contains: User ID (truncated) | Case Number | Timestamp

## Role Permissions

| Role | Download Single | Bulk Export | View History |
|------|----------------|-------------|--------------|
| Public Viewer | ❌ | ❌ | ❌ |
| Investigator | ✅ | ✅ | ❌ |
| Forensic Analyst | ✅ | ✅ | ❌ |
| Legal Professional | ✅ | ✅ | ❌ |
| Court Official | ✅ | ✅ | ❌ |
| Evidence Manager | ✅ | ✅ | ❌ |
| Auditor | ✅ | ✅ | ✅ |
| Administrator | ✅ | ✅ | ✅ |

## Database Schema

### Downloads Table
```sql
CREATE TABLE downloads (
    id SERIAL PRIMARY KEY,
    evidence_id INTEGER REFERENCES evidence(id),
    user_wallet TEXT NOT NULL,
    download_type TEXT NOT NULL CHECK (download_type IN ('single', 'bulk')),
    file_name TEXT,
    watermark_applied BOOLEAN DEFAULT TRUE,
    download_timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB
);
```

## Security Considerations

### Rate Limiting
- 100 downloads per hour per user
- Prevents abuse and ensures system stability
- Separate limits for admin operations

### Audit Trail
- All downloads logged in `activity_logs` table
- Includes user, timestamp, evidence details
- Immutable audit records for compliance

### Access Control
- Role-based permissions enforced
- Public viewers cannot access download functionality
- Admin/Auditor roles can view all download history

### Data Protection
- Watermarks prevent unauthorized redistribution
- Metadata embedding ensures traceability
- Chain of custody maintained through blockchain verification

## Installation

1. **Install Dependencies:**
```bash
npm install archiver sharp pdf-lib
```

2. **Update Database:**
```sql
-- Run evidence-export-schema.sql in Supabase
```

3. **Add to Navigation:**
```html
<a href="evidence-export.html">📥 Export Evidence</a>
```

## Usage Examples

### Basic Download
```javascript
const exporter = new EvidenceExporter('0x1234...5678');
try {
    await exporter.downloadSingle(123);
    alert('Evidence downloaded successfully');
} catch (error) {
    alert('Download failed: ' + error.message);
}
```

### Bulk Export with Progress
```javascript
const evidenceIds = [1, 2, 3, 4, 5];
const exporter = new EvidenceExporter(userWallet);

try {
    await exporter.bulkExport(evidenceIds);
    console.log(`Successfully exported ${evidenceIds.length} files`);
} catch (error) {
    console.error('Export failed:', error);
}
```

### Enhanced Table Integration
```javascript
// Automatically add download buttons to existing evidence table
const exporter = new EvidenceExporter(userWallet);
exporter.enhanceEvidenceTable('#evidenceTable', 'data-evidence-id');
```

## Troubleshooting

### Common Issues

1. **"Public viewers cannot download evidence"**
   - Solution: User role must be investigator or higher

2. **"Maximum 50 files per bulk export"**
   - Solution: Split large exports into smaller batches

3. **"Rate limit exceeded"**
   - Solution: Wait for rate limit window to reset (1 hour)

4. **Watermarking fails**
   - Solution: Original file is returned without watermark
   - Check server logs for specific error details

### Debug Information
- Check browser console for JavaScript errors
- Verify user wallet address is valid
- Confirm user has appropriate role permissions
- Check network tab for API response details

## Future Enhancements

- [ ] Video watermarking with ffmpeg.wasm
- [ ] Advanced watermark customization
- [ ] Batch processing queue for large exports
- [ ] Email notifications for completed exports
- [ ] Integration with external storage providers
- [ ] Advanced audit reporting dashboard