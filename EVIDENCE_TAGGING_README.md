# 🏷️ Evidence Tagging System

## Overview

The Evidence Tagging System is a comprehensive solution for organizing and categorizing digital evidence in the EVID-DGC blockchain evidence management platform. It provides intelligent tagging capabilities with advanced filtering and batch operations.

## Features

### 🎯 Smart Tagging
- **Hierarchical Categories**: Organize tags by priority, status, type, and sensitivity
- **Color-Coded System**: Visual identification with customizable colors
- **Usage Statistics**: Track tag popularity and usage patterns
- **Auto-Suggestions**: Intelligent tag recommendations based on existing data

### 🔍 Advanced Filtering
- **AND/OR Logic**: Flexible filtering with boolean operations
- **Real-time Search**: Instant tag suggestions as you type
- **Multi-criteria Filtering**: Combine multiple tags for precise results
- **Category-based Organization**: Filter by tag categories

### ⚡ Batch Operations
- **Multi-select Evidence**: Tag multiple evidence items simultaneously
- **Bulk Tag Application**: Apply multiple tags to selected evidence
- **Batch Removal**: Remove tags from multiple items at once
- **Progress Tracking**: Monitor batch operation progress

### 🔒 Security & Compliance
- **Role-based Access**: Different permissions for different user roles
- **Audit Logging**: Complete history of tagging actions
- **Blockchain Integration**: Immutable tag history on blockchain
- **Data Integrity**: Cryptographic verification of tag data

## Database Schema

### Tables

#### `tags`
- `id` - Primary key
- `name` - Unique tag name
- `color` - Hex color code for visual identification
- `category` - Tag category (priority, status, type, sensitivity)
- `parent_id` - For hierarchical tags (optional)
- `usage_count` - Number of times tag has been used
- `created_by` - User who created the tag
- `created_at` - Creation timestamp

#### `evidence_tags`
- `evidence_id` - Foreign key to evidence table
- `tag_id` - Foreign key to tags table
- `tagged_by` - User who applied the tag
- `tagged_at` - When tag was applied
- Primary key: `(evidence_id, tag_id)`

### Functions

#### `update_tag_usage_count()`
Automatically updates tag usage statistics when tags are added or removed.

#### `get_evidence_with_all_tags(tag_ids)`
Returns evidence that has ALL specified tags (AND logic).

## API Endpoints

### Tag Management
- `GET /api/tags` - Get all tags with usage statistics
- `POST /api/tags` - Create new tag
- `GET /api/tags/suggest` - Get tag suggestions based on query

### Evidence Tagging
- `POST /api/evidence/:id/tags` - Add tags to evidence
- `DELETE /api/evidence/:id/tags/:tagId` - Remove tag from evidence
- `POST /api/evidence/batch-tag` - Apply tags to multiple evidence items

### Filtering
- `GET /api/evidence/by-tags` - Filter evidence by tags with AND/OR logic

## Usage Examples

### Creating a New Tag
```javascript
const response = await fetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        name: 'high-priority',
        color: '#ef4444',
        category: 'priority',
        userWallet: '0x...'
    })
});
```

### Tagging Evidence
```javascript
const response = await fetch(`/api/evidence/${evidenceId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        tagIds: [1, 2, 3],
        userWallet: '0x...'
    })
});
```

### Filtering Evidence
```javascript
const response = await fetch('/api/evidence/by-tags?tagIds=1,2,3&logic=AND');
```

### Batch Tagging
```javascript
const response = await fetch('/api/evidence/batch-tag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        evidenceIds: [1, 2, 3, 4],
        tagIds: [5, 6],
        userWallet: '0x...'
    })
});
```

## Default Tags

The system comes with pre-configured tags:

### Priority Tags
- `urgent` (Red) - High priority evidence
- `high-priority` (Orange) - Important evidence
- `normal` (Green) - Standard priority

### Status Tags
- `pending-review` (Yellow) - Awaiting review
- `court-ready` (Green) - Ready for court presentation
- `archived` (Gray) - Archived evidence

### Type Tags
- `witness-statement` (Purple) - Witness testimonies
- `surveillance-footage` (Cyan) - Video evidence
- `forensic-analysis` (Pink) - Lab analysis results

### Sensitivity Tags
- `confidential` (Dark Red) - Confidential evidence
- `public` (Green) - Public evidence
- `restricted` (Purple) - Restricted access

## Frontend Components

### EvidenceTagging Class
Main JavaScript class handling all tagging operations:
- Tag creation and management
- Evidence tagging interface
- Filtering and search functionality
- Batch operations

### HTML Interface
- Tag creation form
- Tag search and suggestions
- Evidence grid with tagging capabilities
- Batch operation controls
- Filter controls with AND/OR logic

## Installation

1. **Database Setup**: Run `evidence-tagging-schema.sql` in Supabase
2. **Frontend**: Include `evidence-tagging.js` and `evidence-tagging.html`
3. **API**: Tagging endpoints are included in `server.js`

## Demo

Visit `evidence-tagging-demo.html` for an interactive demonstration of the tagging system capabilities.

## Security Considerations

- All tagging operations require valid user authentication
- Role-based permissions control tag creation and management
- Audit logging tracks all tagging activities
- Tag data integrity is maintained through database constraints
- Blockchain integration ensures immutable tag history

## Performance Optimization

- Database indexes on frequently queried columns
- Efficient batch operations for multiple items
- Usage statistics for popular tag recommendations
- Optimized queries for filtering operations

## Future Enhancements

- Machine learning-based tag suggestions
- Hierarchical tag relationships
- Tag templates for common evidence types
- Advanced analytics and reporting
- Integration with external forensic tools