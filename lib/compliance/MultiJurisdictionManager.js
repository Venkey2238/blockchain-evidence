/**
 * Multi-Jurisdiction Case Routing & Data Residency Manager
 * Handles cross-border data compliance and jurisdiction-specific routing
 */

const crypto = require('crypto');

class MultiJurisdictionManager {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.jurisdictions = new Map();
        this.dataResidencyRules = new Map();
        this.routingPolicies = new Map();
        this.complianceFrameworks = new Map();
        
        this.initializeJurisdictions();
        this.initializeDataResidencyRules();
        this.initializeComplianceFrameworks();
    }

    /**
     * Initialize supported jurisdictions
     */
    initializeJurisdictions() {
        const jurisdictions = [
            {
                code: 'IN',
                name: 'India',
                regions: ['North', 'South', 'East', 'West', 'Central', 'Northeast'],
                dataResidency: 'STRICT',
                legalFramework: 'Indian Evidence Act 1872, IT Act 2000, DPDP Act 2023',
                storageRegions: ['ap-south-1', 'ap-south-2'],
                timezone: 'Asia/Kolkata',
                language: 'en-IN',
                currency: 'INR'
            },
            {
                code: 'US',
                name: 'United States',
                regions: ['Federal', 'State', 'Local'],
                dataResidency: 'MODERATE',
                legalFramework: 'Federal Rules of Evidence, State Evidence Codes',
                storageRegions: ['us-east-1', 'us-west-2'],
                timezone: 'America/New_York',
                language: 'en-US',
                currency: 'USD'
            },
            {
                code: 'EU',
                name: 'European Union',
                regions: ['GDPR Zone'],
                dataResidency: 'STRICT',
                legalFramework: 'GDPR, eIDAS Regulation, Digital Services Act',
                storageRegions: ['eu-west-1', 'eu-central-1'],
                timezone: 'Europe/Brussels',
                language: 'en-EU',
                currency: 'EUR'
            },
            {
                code: 'UK',
                name: 'United Kingdom',
                regions: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
                dataResidency: 'STRICT',
                legalFramework: 'UK GDPR, Data Protection Act 2018, Police and Criminal Evidence Act 1984',
                storageRegions: ['eu-west-2'],
                timezone: 'Europe/London',
                language: 'en-GB',
                currency: 'GBP'
            },
            {
                code: 'CA',
                name: 'Canada',
                regions: ['Federal', 'Provincial'],
                dataResidency: 'MODERATE',
                legalFramework: 'Canada Evidence Act, Personal Information Protection and Electronic Documents Act',
                storageRegions: ['ca-central-1'],
                timezone: 'America/Toronto',
                language: 'en-CA',
                currency: 'CAD'
            },
            {
                code: 'AU',
                name: 'Australia',
                regions: ['Federal', 'State', 'Territory'],
                dataResidency: 'MODERATE',
                legalFramework: 'Evidence Act 1995, Privacy Act 1988, Notifiable Data Breaches scheme',
                storageRegions: ['ap-southeast-2'],
                timezone: 'Australia/Sydney',
                language: 'en-AU',
                currency: 'AUD'
            },
            {
                code: 'GLOBAL',
                name: 'Global/International',
                regions: ['International'],
                dataResidency: 'FLEXIBLE',
                legalFramework: 'International Standards, ISO 27001, NIST Framework',
                storageRegions: ['us-east-1', 'eu-west-1', 'ap-south-1'],
                timezone: 'UTC',
                language: 'en',
                currency: 'USD'
            }
        ];

        for (const jurisdiction of jurisdictions) {
            this.jurisdictions.set(jurisdiction.code, jurisdiction);
        }
    }

    /**
     * Initialize data residency rules
     */
    initializeDataResidencyRules() {
        const rules = [
            {
                jurisdiction: 'IN',
                rule: 'STRICT_RESIDENCY',
                description: 'All data must remain within Indian borders',
                allowedRegions: ['ap-south-1', 'ap-south-2'],
                crossBorderTransfer: false,
                exceptions: ['Legal proceedings with court order'],
                complianceRequirement: 'DPDP Act 2023 compliance mandatory'
            },
            {
                jurisdiction: 'EU',
                rule: 'GDPR_COMPLIANCE',
                description: 'GDPR-compliant data handling required',
                allowedRegions: ['eu-west-1', 'eu-central-1', 'eu-west-2'],
                crossBorderTransfer: true,
                transferConditions: ['Adequacy decision', 'Standard contractual clauses', 'Binding corporate rules'],
                complianceRequirement: 'GDPR Article 44-49 compliance'
            },
            {
                jurisdiction: 'US',
                rule: 'FLEXIBLE_RESIDENCY',
                description: 'Flexible data residency with security requirements',
                allowedRegions: ['us-east-1', 'us-west-2', 'ca-central-1'],
                crossBorderTransfer: true,
                transferConditions: ['Adequate security measures', 'Legal framework compliance'],
                complianceRequirement: 'SOC 2 Type II compliance'
            },
            {
                jurisdiction: 'UK',
                rule: 'UK_GDPR_COMPLIANCE',
                description: 'UK GDPR and data protection compliance',
                allowedRegions: ['eu-west-2', 'eu-west-1'],
                crossBorderTransfer: true,
                transferConditions: ['UK adequacy regulations', 'International data transfer agreement'],
                complianceRequirement: 'UK GDPR compliance'
            },
            {
                jurisdiction: 'GLOBAL',
                rule: 'BEST_PRACTICE',
                description: 'International best practices for data handling',
                allowedRegions: ['*'],
                crossBorderTransfer: true,
                transferConditions: ['Encryption in transit and at rest', 'Access controls'],
                complianceRequirement: 'ISO 27001 compliance'
            }
        ];

        for (const rule of rules) {
            this.dataResidencyRules.set(rule.jurisdiction, rule);
        }
    }

    /**
     * Initialize compliance frameworks
     */
    initializeComplianceFrameworks() {
        const frameworks = [
            {
                jurisdiction: 'IN',
                frameworks: [
                    {
                        name: 'Digital Personal Data Protection Act 2023',
                        requirements: ['Data localization', 'Consent management', 'Data breach notification'],
                        penalties: 'Up to ₹250 crores'
                    },
                    {
                        name: 'Information Technology Act 2000',
                        requirements: ['Digital signature compliance', 'Cyber security measures'],
                        penalties: 'Imprisonment and fines'
                    }
                ]
            },
            {
                jurisdiction: 'EU',
                frameworks: [
                    {
                        name: 'General Data Protection Regulation (GDPR)',
                        requirements: ['Lawful basis', 'Data minimization', 'Right to erasure', 'Data portability'],
                        penalties: 'Up to €20 million or 4% of annual turnover'
                    },
                    {
                        name: 'eIDAS Regulation',
                        requirements: ['Electronic identification', 'Trust services', 'Electronic signatures'],
                        penalties: 'Administrative sanctions'
                    }
                ]
            }
        ];

        for (const framework of frameworks) {
            this.complianceFrameworks.set(framework.jurisdiction, framework);
        }
    }

    /**
     * Route case to appropriate jurisdiction
     */
    async routeCase(caseData, requestingUser) {
        try {
            const routing = {
                caseId: caseData.id,
                requestingUser: requestingUser.id,
                sourceJurisdiction: requestingUser.jurisdiction,
                targetJurisdiction: caseData.jurisdiction,
                routingDecision: null,
                dataResidencyCompliance: null,
                requiredApprovals: [],
                restrictions: [],
                timestamp: new Date().toISOString()
            };

            // Check if cross-jurisdiction routing is needed
            if (requestingUser.jurisdiction === caseData.jurisdiction) {
                routing.routingDecision = 'DIRECT_ACCESS';
                routing.dataResidencyCompliance = 'COMPLIANT';
                return routing;
            }

            // Evaluate cross-jurisdiction access
            const accessEvaluation = await this.evaluateCrossJurisdictionAccess(
                requestingUser.jurisdiction,
                caseData.jurisdiction,
                caseData,
                requestingUser
            );

            routing.routingDecision = accessEvaluation.decision;
            routing.dataResidencyCompliance = accessEvaluation.compliance;
            routing.requiredApprovals = accessEvaluation.requiredApprovals;
            routing.restrictions = accessEvaluation.restrictions;

            // Log routing decision
            await this.logRoutingDecision(routing);

            return routing;

        } catch (error) {
            console.error('Failed to route case:', error);
            throw error;
        }
    }

    /**
     * Evaluate cross-jurisdiction access
     */
    async evaluateCrossJurisdictionAccess(sourceJurisdiction, targetJurisdiction, caseData, user) {
        const evaluation = {
            decision: 'DENIED',
            compliance: 'NON_COMPLIANT',
            requiredApprovals: [],
            restrictions: [],
            reason: ''
        };

        const sourceRules = this.dataResidencyRules.get(sourceJurisdiction);
        const targetRules = this.dataResidencyRules.get(targetJurisdiction);

        if (!sourceRules || !targetRules) {
            evaluation.reason = 'Unknown jurisdiction rules';
            return evaluation;
        }

        // Check if cross-border transfer is allowed
        if (!targetRules.crossBorderTransfer) {
            evaluation.reason = `${targetJurisdiction} does not allow cross-border data access`;
            evaluation.requiredApprovals.push('COURT_ORDER');
            evaluation.requiredApprovals.push('DATA_PROTECTION_AUTHORITY');
            return evaluation;
        }

        // Check user permissions and role
        const hasPermission = await this.checkUserCrossJurisdictionPermission(user, targetJurisdiction);
        if (!hasPermission) {
            evaluation.reason = 'User lacks cross-jurisdiction permissions';
            evaluation.requiredApprovals.push('ADMIN_APPROVAL');
            return evaluation;
        }

        // Check case sensitivity and classification
        const sensitivityCheck = this.evaluateCaseSensitivity(caseData, sourceJurisdiction, targetJurisdiction);
        if (sensitivityCheck.requiresApproval) {
            evaluation.requiredApprovals.push(...sensitivityCheck.approvals);
            evaluation.restrictions.push(...sensitivityCheck.restrictions);
        }

        // Check data residency compliance
        const residencyCompliance = this.checkDataResidencyCompliance(
            caseData,
            sourceJurisdiction,
            targetJurisdiction
        );

        if (residencyCompliance.compliant) {
            evaluation.decision = 'APPROVED';
            evaluation.compliance = 'COMPLIANT';
            evaluation.reason = 'Cross-jurisdiction access approved with conditions';
        } else {
            evaluation.decision = 'CONDITIONAL';
            evaluation.compliance = 'REQUIRES_REVIEW';
            evaluation.reason = 'Cross-jurisdiction access requires additional compliance measures';
            evaluation.requiredApprovals.push('COMPLIANCE_OFFICER');
        }

        return evaluation;
    }

    /**
     * Check user cross-jurisdiction permission
     */
    async checkUserCrossJurisdictionPermission(user, targetJurisdiction) {
        try {
            const { data: permissions } = await this.supabase
                .from('user_jurisdiction_permissions')
                .select('*')
                .eq('user_id', user.id)
                .eq('jurisdiction', targetJurisdiction)
                .eq('is_active', true);

            return permissions && permissions.length > 0;
        } catch (error) {
            console.error('Failed to check user permissions:', error);
            return false;
        }
    }

    /**
     * Evaluate case sensitivity for cross-jurisdiction access
     */
    evaluateCaseSensitivity(caseData, sourceJurisdiction, targetJurisdiction) {
        const evaluation = {
            requiresApproval: false,
            approvals: [],
            restrictions: []
        };

        // High-sensitivity cases require additional approvals
        if (caseData.priority === 'critical' || caseData.classification === 'confidential') {
            evaluation.requiresApproval = true;
            evaluation.approvals.push('SENIOR_LEGAL_OFFICER');
            evaluation.restrictions.push('VIEW_ONLY_ACCESS');
        }

        // Criminal cases have stricter requirements
        if (caseData.type === 'criminal') {
            evaluation.requiresApproval = true;
            evaluation.approvals.push('LAW_ENFORCEMENT_LIAISON');
        }

        // Certain jurisdiction combinations require special handling
        const restrictedCombinations = [
            ['IN', 'US'], ['EU', 'US'], ['IN', 'EU']
        ];

        for (const [source, target] of restrictedCombinations) {
            if ((sourceJurisdiction === source && targetJurisdiction === target) ||
                (sourceJurisdiction === target && targetJurisdiction === source)) {
                evaluation.requiresApproval = true;
                evaluation.approvals.push('INTERNATIONAL_LEGAL_COUNSEL');
                evaluation.restrictions.push('AUDIT_ALL_ACCESS');
                break;
            }
        }

        return evaluation;
    }

    /**
     * Check data residency compliance
     */
    checkDataResidencyCompliance(caseData, sourceJurisdiction, targetJurisdiction) {
        const compliance = {
            compliant: false,
            issues: [],
            recommendations: []
        };

        const sourceRules = this.dataResidencyRules.get(sourceJurisdiction);
        const targetRules = this.dataResidencyRules.get(targetJurisdiction);

        // Check storage region compatibility
        const hasCompatibleRegions = sourceRules.allowedRegions.some(region =>
            targetRules.allowedRegions.includes(region) || targetRules.allowedRegions.includes('*')
        );

        if (!hasCompatibleRegions) {
            compliance.issues.push('No compatible storage regions');
            compliance.recommendations.push('Data migration to compliant region required');
        }

        // Check transfer conditions
        if (targetRules.crossBorderTransfer && targetRules.transferConditions) {
            for (const condition of targetRules.transferConditions) {
                // Mock condition checking - in production, verify actual compliance
                const conditionMet = this.checkTransferCondition(condition, caseData);
                if (!conditionMet) {
                    compliance.issues.push(`Transfer condition not met: ${condition}`);
                    compliance.recommendations.push(`Implement ${condition} before transfer`);
                }
            }
        }

        compliance.compliant = compliance.issues.length === 0;
        return compliance;
    }

    /**
     * Check specific transfer condition
     */
    checkTransferCondition(condition, caseData) {
        // Mock implementation - in production, check actual compliance
        const conditionChecks = {
            'Adequacy decision': true,
            'Standard contractual clauses': true,
            'Binding corporate rules': true,
            'Adequate security measures': true,
            'Legal framework compliance': true,
            'UK adequacy regulations': true,
            'International data transfer agreement': true,
            'Encryption in transit and at rest': true,
            'Access controls': true
        };

        return conditionChecks[condition] || false;
    }

    /**
     * Grant cross-jurisdiction access
     */
    async grantCrossJurisdictionAccess(caseId, targetJurisdiction, grantedBy, conditions = {}) {
        try {
            const accessGrant = {
                id: crypto.randomUUID(),
                case_id: caseId,
                target_jurisdiction: targetJurisdiction,
                granted_by: grantedBy,
                granted_at: new Date().toISOString(),
                conditions: conditions,
                expires_at: conditions.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                is_active: true
            };

            const { data, error } = await this.supabase
                .from('cross_jurisdiction_access_grants')
                .insert([accessGrant]);

            if (error) throw error;

            // Log the access grant
            await this.logAccessGrant(accessGrant);

            return accessGrant;

        } catch (error) {
            console.error('Failed to grant cross-jurisdiction access:', error);
            throw error;
        }
    }

    /**
     * Revoke cross-jurisdiction access
     */
    async revokeCrossJurisdictionAccess(grantId, revokedBy, reason) {
        try {
            const { data, error } = await this.supabase
                .from('cross_jurisdiction_access_grants')
                .update({
                    is_active: false,
                    revoked_by: revokedBy,
                    revoked_at: new Date().toISOString(),
                    revocation_reason: reason
                })
                .eq('id', grantId);

            if (error) throw error;

            // Log the revocation
            await this.logAccessRevocation(grantId, revokedBy, reason);

            return { success: true };

        } catch (error) {
            console.error('Failed to revoke cross-jurisdiction access:', error);
            throw error;
        }
    }

    /**
     * Check if evidence can be exported to jurisdiction
     */
    async checkEvidenceExportCompliance(evidenceId, targetJurisdiction, exportType) {
        try {
            const { data: evidence } = await this.supabase
                .from('evidence')
                .select(`
                    *,
                    cases (
                        jurisdiction,
                        type,
                        classification
                    )
                `)
                .eq('id', evidenceId)
                .single();

            if (!evidence) {
                throw new Error('Evidence not found');
            }

            const compliance = {
                allowed: false,
                restrictions: [],
                requirements: [],
                reason: ''
            };

            const sourceJurisdiction = evidence.cases.jurisdiction;
            const sourceRules = this.dataResidencyRules.get(sourceJurisdiction);
            const targetRules = this.dataResidencyRules.get(targetJurisdiction);

            // Check export restrictions
            if (!sourceRules.crossBorderTransfer) {
                compliance.reason = 'Source jurisdiction prohibits cross-border data transfer';
                compliance.requirements.push('COURT_ORDER');
                return compliance;
            }

            // Check evidence classification
            if (evidence.classification === 'restricted' || evidence.classification === 'confidential') {
                compliance.restrictions.push('REDACTION_REQUIRED');
                compliance.requirements.push('SENIOR_APPROVAL');
            }

            // Check export type restrictions
            if (exportType === 'FULL_EXPORT' && sourceJurisdiction === 'IN') {
                compliance.restrictions.push('METADATA_ONLY');
                compliance.requirements.push('DATA_LOCALIZATION_COMPLIANCE');
            }

            compliance.allowed = true;
            compliance.reason = 'Export allowed with conditions';

            return compliance;

        } catch (error) {
            console.error('Failed to check evidence export compliance:', error);
            throw error;
        }
    }

    /**
     * Get jurisdiction compliance report
     */
    async getJurisdictionComplianceReport(jurisdiction, timeRange = '30d') {
        try {
            const startDate = new Date(Date.now() - this.parseTimeRange(timeRange));

            const [routingData, accessGrants, violations] = await Promise.all([
                this.getRoutingStatistics(jurisdiction, startDate),
                this.getAccessGrantStatistics(jurisdiction, startDate),
                this.getComplianceViolations(jurisdiction, startDate)
            ]);

            const report = {
                jurisdiction,
                timeRange,
                generatedAt: new Date().toISOString(),
                summary: {
                    totalCases: routingData.totalCases,
                    crossJurisdictionRequests: routingData.crossJurisdictionRequests,
                    approvedRequests: routingData.approvedRequests,
                    deniedRequests: routingData.deniedRequests,
                    activeAccessGrants: accessGrants.active,
                    expiredAccessGrants: accessGrants.expired,
                    complianceViolations: violations.length,
                    complianceScore: this.calculateComplianceScore(routingData, violations)
                },
                details: {
                    routing: routingData,
                    accessGrants: accessGrants,
                    violations: violations
                },
                recommendations: this.generateComplianceRecommendations(routingData, violations)
            };

            return report;

        } catch (error) {
            console.error('Failed to generate compliance report:', error);
            throw error;
        }
    }

    // Helper methods
    async logRoutingDecision(routing) {
        try {
            await this.supabase
                .from('jurisdiction_routing_log')
                .insert([{
                    case_id: routing.caseId,
                    requesting_user: routing.requestingUser,
                    source_jurisdiction: routing.sourceJurisdiction,
                    target_jurisdiction: routing.targetJurisdiction,
                    routing_decision: routing.routingDecision,
                    compliance_status: routing.dataResidencyCompliance,
                    required_approvals: routing.requiredApprovals,
                    restrictions: routing.restrictions,
                    created_at: routing.timestamp
                }]);
        } catch (error) {
            console.error('Failed to log routing decision:', error);
        }
    }

    async logAccessGrant(accessGrant) {
        try {
            await this.supabase
                .from('security_events')
                .insert([{
                    event_type: 'CROSS_JURISDICTION_ACCESS_GRANTED',
                    resource_type: 'case',
                    resource_id: accessGrant.case_id,
                    user_id: accessGrant.granted_by,
                    metadata: {
                        targetJurisdiction: accessGrant.target_jurisdiction,
                        conditions: accessGrant.conditions,
                        expiresAt: accessGrant.expires_at
                    }
                }]);
        } catch (error) {
            console.error('Failed to log access grant:', error);
        }
    }

    async logAccessRevocation(grantId, revokedBy, reason) {
        try {
            await this.supabase
                .from('security_events')
                .insert([{
                    event_type: 'CROSS_JURISDICTION_ACCESS_REVOKED',
                    resource_type: 'access_grant',
                    resource_id: grantId,
                    user_id: revokedBy,
                    metadata: {
                        reason: reason
                    }
                }]);
        } catch (error) {
            console.error('Failed to log access revocation:', error);
        }
    }

    parseTimeRange(timeRange) {
        const units = {
            'd': 24 * 60 * 60 * 1000,
            'h': 60 * 60 * 1000,
            'm': 60 * 1000
        };

        const match = timeRange.match(/^(\d+)([dhm])$/);
        if (!match) return 30 * 24 * 60 * 60 * 1000; // Default 30 days

        const [, amount, unit] = match;
        return parseInt(amount) * units[unit];
    }

    async getRoutingStatistics(jurisdiction, startDate) {
        // Mock implementation - in production, query actual data
        return {
            totalCases: 150,
            crossJurisdictionRequests: 25,
            approvedRequests: 20,
            deniedRequests: 5,
            pendingRequests: 0
        };
    }

    async getAccessGrantStatistics(jurisdiction, startDate) {
        // Mock implementation
        return {
            active: 15,
            expired: 8,
            revoked: 2
        };
    }

    async getComplianceViolations(jurisdiction, startDate) {
        // Mock implementation
        return [];
    }

    calculateComplianceScore(routingData, violations) {
        const baseScore = 100;
        const violationPenalty = violations.length * 10;
        const denialRate = routingData.crossJurisdictionRequests > 0 ? 
            (routingData.deniedRequests / routingData.crossJurisdictionRequests) * 20 : 0;
        
        return Math.max(0, baseScore - violationPenalty - denialRate);
    }

    generateComplianceRecommendations(routingData, violations) {
        const recommendations = [];

        if (violations.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Compliance Violations',
                recommendation: 'Address compliance violations immediately',
                impact: 'Legal and regulatory risk'
            });
        }

        if (routingData.deniedRequests > routingData.approvedRequests * 0.2) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Access Management',
                recommendation: 'Review cross-jurisdiction access policies',
                impact: 'Operational efficiency'
            });
        }

        return recommendations;
    }
}

module.exports = MultiJurisdictionManager;