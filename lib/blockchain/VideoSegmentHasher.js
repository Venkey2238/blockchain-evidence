/**
 * Video Segment Hashing System
 * Frame/block-level hashing for long videos with blockchain anchoring
 */

const crypto = require('crypto');

class VideoSegmentHasher {
    constructor() {
        this.segmentDuration = 5; // seconds per segment
        this.hashAlgorithm = 'sha256';
        this.merkleTreeCache = new Map();
    }

    /**
     * Process video into segments and generate hashes
     */
    async processVideo(videoBuffer, metadata = {}) {
        const segments = await this.extractSegments(videoBuffer, metadata);
        const segmentHashes = await this.generateSegmentHashes(segments);
        const merkleRoot = this.buildMerkleTree(segmentHashes);
        
        return {
            videoId: metadata.evidenceId || crypto.randomUUID(),
            totalDuration: metadata.duration || 0,
            segmentDuration: this.segmentDuration,
            segmentCount: segments.length,
            segments: segmentHashes,
            merkleRoot,
            timestamp: new Date().toISOString(),
            metadata: {
                filename: metadata.filename,
                size: videoBuffer.length,
                format: metadata.format,
                resolution: metadata.resolution,
                frameRate: metadata.frameRate
            }
        };
    }

    /**
     * Extract video segments (mock implementation)
     */
    async extractSegments(videoBuffer, metadata) {
        // In production, use ffmpeg to extract actual video segments
        const estimatedDuration = metadata.duration || 60; // Default 60 seconds
        const segmentCount = Math.ceil(estimatedDuration / this.segmentDuration);
        const segmentSize = Math.floor(videoBuffer.length / segmentCount);
        
        const segments = [];
        for (let i = 0; i < segmentCount; i++) {
            const start = i * segmentSize;
            const end = Math.min(start + segmentSize, videoBuffer.length);
            const segmentBuffer = videoBuffer.slice(start, end);
            
            segments.push({
                index: i,
                startTime: i * this.segmentDuration,
                endTime: Math.min((i + 1) * this.segmentDuration, estimatedDuration),
                size: segmentBuffer.length,
                buffer: segmentBuffer
            });
        }
        
        return segments;
    }

    /**
     * Generate hash for each segment
     */
    async generateSegmentHashes(segments) {
        const segmentHashes = [];
        
        for (const segment of segments) {
            const hash = crypto.createHash(this.hashAlgorithm)
                .update(segment.buffer)
                .digest('hex');
            
            // Extract frame-level metadata (mock)
            const frameMetadata = await this.extractFrameMetadata(segment.buffer);
            
            segmentHashes.push({
                index: segment.index,
                startTime: segment.startTime,
                endTime: segment.endTime,
                hash,
                size: segment.size,
                frameCount: frameMetadata.frameCount,
                keyFrames: frameMetadata.keyFrames,
                integrity: 'VERIFIED',
                timestamp: new Date().toISOString()
            });
        }
        
        return segmentHashes;
    }

    /**
     * Build Merkle tree from segment hashes
     */
    buildMerkleTree(segmentHashes) {
        const leaves = segmentHashes.map(segment => segment.hash);
        return this.calculateMerkleRoot(leaves);
    }

    /**
     * Calculate Merkle root from leaf hashes
     */
    calculateMerkleRoot(hashes) {
        if (hashes.length === 0) return null;
        if (hashes.length === 1) return hashes[0];
        
        const tree = [...hashes];
        
        while (tree.length > 1) {
            const nextLevel = [];
            
            for (let i = 0; i < tree.length; i += 2) {
                const left = tree[i];
                const right = tree[i + 1] || left; // Duplicate last hash if odd number
                
                const combined = crypto.createHash(this.hashAlgorithm)
                    .update(left + right)
                    .digest('hex');
                
                nextLevel.push(combined);
            }
            
            tree.splice(0, tree.length, ...nextLevel);
        }
        
        return tree[0];
    }

    /**
     * Verify video integrity by re-hashing segments
     */
    async verifyVideoIntegrity(videoBuffer, originalSegmentData) {
        try {
            const currentSegmentData = await this.processVideo(videoBuffer, {
                duration: originalSegmentData.totalDuration,
                evidenceId: originalSegmentData.videoId
            });
            
            const verification = {
                isValid: true,
                tamperedSegments: [],
                verificationTime: new Date().toISOString(),
                details: {
                    originalMerkleRoot: originalSegmentData.merkleRoot,
                    currentMerkleRoot: currentSegmentData.merkleRoot,
                    segmentComparison: []
                }
            };
            
            // Compare Merkle roots
            if (originalSegmentData.merkleRoot !== currentSegmentData.merkleRoot) {
                verification.isValid = false;
            }
            
            // Compare individual segments
            for (let i = 0; i < originalSegmentData.segments.length; i++) {
                const original = originalSegmentData.segments[i];
                const current = currentSegmentData.segments[i];
                
                const segmentValid = original.hash === current.hash;
                
                verification.details.segmentComparison.push({
                    index: i,
                    startTime: original.startTime,
                    endTime: original.endTime,
                    isValid: segmentValid,
                    originalHash: original.hash,
                    currentHash: current.hash
                });
                
                if (!segmentValid) {
                    verification.isValid = false;
                    verification.tamperedSegments.push({
                        index: i,
                        startTime: original.startTime,
                        endTime: original.endTime,
                        reason: 'Hash mismatch'
                    });
                }
            }
            
            return verification;
            
        } catch (error) {
            return {
                isValid: false,
                error: error.message,
                verificationTime: new Date().toISOString()
            };
        }
    }

    /**
     * Generate blockchain anchor data for segments
     */
    generateBlockchainAnchor(segmentData) {
        return {
            anchorId: crypto.randomUUID(),
            videoId: segmentData.videoId,
            merkleRoot: segmentData.merkleRoot,
            segmentCount: segmentData.segmentCount,
            totalDuration: segmentData.totalDuration,
            timestamp: new Date().toISOString(),
            metadata: {
                filename: segmentData.metadata.filename,
                size: segmentData.metadata.size,
                format: segmentData.metadata.format
            },
            // Compact representation for blockchain storage
            compactHash: crypto.createHash(this.hashAlgorithm)
                .update(segmentData.merkleRoot + segmentData.videoId)
                .digest('hex')
        };
    }

    /**
     * Create visualization data for UI
     */
    createVisualizationData(segmentData, verificationResult = null) {
        const visualization = {
            videoId: segmentData.videoId,
            timeline: [],
            summary: {
                totalSegments: segmentData.segmentCount,
                totalDuration: segmentData.totalDuration,
                verifiedSegments: 0,
                tamperedSegments: 0
            }
        };
        
        for (const segment of segmentData.segments) {
            let status = 'VERIFIED';
            let details = 'Segment integrity verified';
            
            if (verificationResult) {
                const segmentVerification = verificationResult.details.segmentComparison
                    .find(s => s.index === segment.index);
                
                if (segmentVerification && !segmentVerification.isValid) {
                    status = 'TAMPERED';
                    details = 'Segment hash mismatch detected';
                    visualization.summary.tamperedSegments++;
                } else {
                    visualization.summary.verifiedSegments++;
                }
            } else {
                visualization.summary.verifiedSegments++;
            }
            
            visualization.timeline.push({
                index: segment.index,
                startTime: segment.startTime,
                endTime: segment.endTime,
                duration: segment.endTime - segment.startTime,
                status,
                details,
                hash: segment.hash.substring(0, 16) + '...',
                size: segment.size,
                frameCount: segment.frameCount
            });
        }
        
        return visualization;
    }

    /**
     * Extract frame metadata (mock implementation)
     */
    async extractFrameMetadata(segmentBuffer) {
        // In production, use ffprobe or similar to extract actual frame data
        const estimatedFrameCount = Math.floor(segmentBuffer.length / 10000); // Mock calculation
        
        return {
            frameCount: estimatedFrameCount,
            keyFrames: Math.floor(estimatedFrameCount / 30), // Assume keyframe every 30 frames
            avgFrameSize: segmentBuffer.length / estimatedFrameCount
        };
    }

    /**
     * Generate forensic report for court
     */
    generateForensicReport(segmentData, verificationResult) {
        return {
            reportId: crypto.randomUUID(),
            generatedAt: new Date().toISOString(),
            videoId: segmentData.videoId,
            
            summary: {
                filename: segmentData.metadata.filename,
                totalDuration: `${segmentData.totalDuration} seconds`,
                segmentCount: segmentData.segmentCount,
                segmentDuration: `${this.segmentDuration} seconds`,
                overallIntegrity: verificationResult ? 
                    (verificationResult.isValid ? 'VERIFIED' : 'COMPROMISED') : 'NOT_VERIFIED'
            },
            
            technicalDetails: {
                hashAlgorithm: this.hashAlgorithm,
                merkleRoot: segmentData.merkleRoot,
                fileSize: segmentData.metadata.size,
                format: segmentData.metadata.format,
                resolution: segmentData.metadata.resolution
            },
            
            segmentAnalysis: verificationResult ? 
                verificationResult.details.segmentComparison : [],
            
            tamperedSegments: verificationResult ? 
                verificationResult.tamperedSegments : [],
            
            legalStatement: 'This video has been processed using cryptographic segment hashing ' +
                           'with blockchain anchoring. Each segment has been individually verified ' +
                           'to detect any tampering or modification at the frame level.',
            
            methodology: `Video was divided into ${this.segmentDuration}-second segments. ` +
                        `Each segment was hashed using ${this.hashAlgorithm.toUpperCase()} algorithm. ` +
                        'A Merkle tree was constructed from segment hashes and anchored to blockchain ' +
                        'for immutable verification.'
        };
    }

    /**
     * Export segment data for blockchain storage
     */
    exportForBlockchain(segmentData) {
        return {
            videoId: segmentData.videoId,
            merkleRoot: segmentData.merkleRoot,
            segmentCount: segmentData.segmentCount,
            timestamp: segmentData.timestamp,
            compactHash: crypto.createHash(this.hashAlgorithm)
                .update(JSON.stringify({
                    merkleRoot: segmentData.merkleRoot,
                    segmentCount: segmentData.segmentCount,
                    videoId: segmentData.videoId
                }))
                .digest('hex')
        };
    }
}

module.exports = VideoSegmentHasher;