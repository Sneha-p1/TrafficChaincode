/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class TrafficContract extends Contract {

    // Check if a vehicle exists
    async vehicleExists(ctx, vehicleId) {
        const buffer = await ctx.stub.getState(vehicleId);
        return (!!buffer && buffer.length > 0);
    }

    // MVD creates vehicle details
    async createVehicle(ctx, vehicleId, ownerName, registrationNumber, model) {
        const mspID = ctx.clientIdentity.getMSPID();
        if (mspID === 'MVDMSP') {
            const exists = await this.vehicleExists(ctx, vehicleId);
            if (exists) {
                throw new Error(`The vehicle ${vehicleId} already exists`);
            }
            const vehicle = {
                ownerName,
                registrationNumber,
                model,
                status: 'Active',
                assetType: 'vehicle'
            };
            const buffer = Buffer.from(JSON.stringify(vehicle));
            await ctx.stub.putState(vehicleId, buffer);
        } else {
            return `User under MSP: ${mspID} cannot perform this action`;
        }
    }

    async readVehicle(ctx, vehicleId) {
        const exists = await this.vehicleExists(ctx, vehicleId);
        if (!exists) {
            throw new Error(`The car ${vehicleId} does not exist`);
        }
        const buffer = await ctx.stub.getState(vehicleId);
        const asset = JSON.parse(buffer.toString());
        return asset;
    }



    // TMA creates a traffic violation
    async createTrafficViolation(ctx, violationId, vehicleId, description, fineAmount) {
        const mspID = ctx.clientIdentity.getMSPID();
        if (mspID === 'TrafficManagementMSP') {
            const violation = {
                violationId,
                vehicleId,
                description,
                fineAmount,
                status: 'Pending',
                assetType: 'trafficViolation'
            };
            const buffer = Buffer.from(JSON.stringify(violation));
            await ctx.stub.putState(violationId, buffer);
        } else {
            return `User under MSP: ${mspID} cannot perform this action`;
        }
    }

    async readViolation(ctx, vehicleId) {
        const exists = await this.vehicleExists(ctx, vehicleId);
        if (!exists) {
            throw new Error(`The Vehicle ${vehicleId} does not exist`);
        }
        const buffer = await ctx.stub.getState(vehicleId);
        const asset = JSON.parse(buffer.toString());
        return asset;
    }

    // MVD issues fine based on TMA's violation
    async issueFine(ctx, violationId) {
        const mspID = ctx.clientIdentity.getMSPID();
        if (mspID === 'MVDMSP') {
            const violationBuffer = await ctx.stub.getState(violationId);
            if (!violationBuffer || violationBuffer.length === 0) {
                throw new Error(`The violation ${violationId} does not exist`);
            }
            const violation = JSON.parse(violationBuffer.toString());
            violation.status = 'Fined';

            const newViolationBuffer = Buffer.from(JSON.stringify(violation));
            await ctx.stub.putState(violationId, newViolationBuffer);
            return `Fine issued for violation ${violationId}`;
        } else {
            return `User under MSP: ${mspID} cannot perform this action`;
        }
    }

    async readissueFine(ctx, violationId) {
        const exists = await this.vehicleExists(ctx, violationId);
        if (!exists) {
            throw new Error(`The violation ${violationId} does not exist`);
        }
        const buffer = await ctx.stub.getState(violationId);
        const asset = JSON.parse(buffer.toString());
        return asset;
    }

    // TMA creates accident report and passes it to Law Enforcement
    async createAccidentReport(ctx, reportId, vehicleId, accidentDetails) {
        const mspID = ctx.clientIdentity.getMSPID();
        if (mspID === 'TrafficManagementMSP') {
            const report = {
                vehicleId,
                accidentDetails,
                status: 'Reported',
                assetType: 'accidentReport'
            };
            const buffer = Buffer.from(JSON.stringify(report));
            await ctx.stub.putState(reportId, buffer);
        } else {
            return `User under MSP: ${mspID} cannot perform this action`;
        }
    }

    // Insurance Company matches accident records with MVD data
    async matchInsuranceDetails(ctx, reportId, registrationNumber) {
        const mspID = ctx.clientIdentity.getMSPID();
        if (mspID === 'InsuranceCompanyMSP') {
            const reportBuffer = await ctx.stub.getState(reportId);
            if (!reportBuffer || reportBuffer.length === 0) {
                throw new Error(`The accident report ${reportId} does not exist`);
            }
            const vehicleQueryString = {
                selector: {
                    assetType: 'vehicle',
                    registrationNumber: registrationNumber
                }
            };
            let resultIterator = await ctx.stub.getQueryResult(JSON.stringify(vehicleQueryString));
            let vehicleDetails = await this._getAllResults(resultIterator);

            return {
                accidentReport: JSON.parse(reportBuffer.toString()),
                matchedVehicleDetails: vehicleDetails
            };
        } else {
            return `User under MSP: ${mspID} cannot perform this action`;
        }
    }

    // Utility function to get all results
    async _getAllResults(iterator) {
        let allResults = [];
        let res = await iterator.next();
        while (!res.done) {
            if (res.value && res.value.value.toString()) {
                let jsonRes = {};
                jsonRes.Key = res.value.key;
                jsonRes.Record = JSON.parse(res.value.value.toString());
                allResults.push(jsonRes);
            }
            res = await iterator.next();
        }
        await iterator.close();
        return allResults;
    }

}

module.exports = TrafficContract;

