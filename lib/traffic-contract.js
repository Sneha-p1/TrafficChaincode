/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

async function getCollectionName(ctx) {
    const collectionName = 'ViolationCollection';
    return collectionName;
}

class TrafficContract extends Contract {

    async violationExists(ctx, violationId) {
        const collectionName = await getCollectionName(ctx);
        const data = await ctx.stub.getPrivateDataHash(collectionName, violationId);
        return (!!data && data.length > 0);
    }

    // Check if a vehicle exists
    async vehicleExists(ctx, vehicleId) {
        const collectionName = await getCollectionName(ctx);
        const data = await ctx.stub.getPrivateDataHash(collectionName, vehicleId);
        return (!!data && data.length > 0);
    }

    // MVD creates vehicle details
    async createVehicle(ctx, vehicleId, ownerName, registrationNumber, model) {
        const mspID = ctx.clientIdentity.getMSPID();
        if (mspID === 'MVDMSP') {
            const exists = await this.vehicleExists(ctx, vehicleId, ownerName, registrationNumber, model);
            if (exists) {
                throw new Error(`The vehicle ${vehicleId} already exists`);
            }
            const Createvehicle = {};

            const transientData = ctx.stub.getTransient();

            if (transientData.size === 0 || !transientData.has('vehicleId')
                || !transientData.has('ownerName') || !transientData.has('registrationNumber')
                || !transientData.has('model')
            ) {
                throw new Error('The expected key was not specified in transient data. Please try again.');
            }

            Createvehicle.vehicleId = transientData.get('vehicleId').toString();
            Createvehicle.ownerName = transientData.get('ownerName').toString();
            Createvehicle.registrationNumber = transientData.get('registrationNumber').toString();
            Createvehicle.model = transientData.get('model').toString();
            Createvehicle.assetType = 'vehicle';


            const collectionName = await getCollectionName(ctx);
            await ctx.stub.putPrivateData(collectionName, vehicleId, Buffer.from(JSON.stringify(Createvehicle)));
        } else {
            return `Organisation with mspid ${mspID} cannot perform this action`;
        }
    }

    async readVehicle(ctx, vehicleId) {
        const exists = await this.vehicleExists(ctx, vehicleId);
        if (!exists) {
            throw new Error(`The vehicle ${vehicleId} does not exist`);
        }

        let privateDataString;
        const collectionName = await getCollectionName(ctx);
        const privateData = await ctx.stub.getPrivateData(collectionName, vehicleId);
        privateDataString = JSON.parse(privateData.toString());
        return privateDataString;
    }



    // TMA creates a traffic violation
    async createTrafficViolation(ctx, violationId, vehicleId, registrationNumber, description) {
        const mspID = ctx.clientIdentity.getMSPID();
        if (mspID === 'TrafficManagementMSP') {
            const violation = {
                violationId,
                vehicleId,
                registrationNumber,
                description,
                status: 'Pending',
                assetType: 'trafficViolation'
            };

            const transientData = ctx.stub.getTransient();
            if (transientData.size === 0 || !transientData.has('violationId')
                || !transientData.has('vehicleId') || !transientData.has('registrationNumber')
                || !transientData.has('description')
            ) {
                throw new Error('The expected key was not specified in transient data. Please try again.');
            }

            violation.violationId = transientData.get('violationId').toString();
            violation.vehicleId = transientData.get('vehicleId').toString();
            violation.registrationNumber = transientData.get('registrationNumber').toString();
            violation.description = transientData.get('description').toString();
            violation.assetType = 'violation';


            const collectionName = await getCollectionName(ctx);
            await ctx.stub.putPrivateData(collectionName, violationId, Buffer.from(JSON.stringify(violation)));
        } else {
            return `Organisation with mspid ${mspID} cannot perform this action`;
        }
    }

    async readViolation(ctx, violationId) {
        const exists = await this.vehicleExists(ctx, violationId);
        if (!exists) {
            throw new Error(`The Vehicle ${violationId} does not exist`);
        }

        let privateDataString;
        const collectionName = await getCollectionName(ctx);
        const privateData = await ctx.stub.getPrivateData(collectionName, violationId);
        privateDataString = JSON.parse(privateData.toString());
        return privateDataString;
    }


// MVD issues fine based on TMA's violation, then matches it with available products
async matchViolation(ctx, vehicleId, violationId, fineamount, ) {
    const mspID = ctx.clientIdentity.getMSPID();
if (mspID !== 'MVDMSP') {
    return `Organization with MSP ID ${mspID} cannot perform this action.`;
}

    const vehicleExists = await this.vehicleExists(ctx, vehicleId);
    if (!vehicleExists) {
        throw new Error(`The vehicleExists ${vehicleId} does not exist`);
    }

    const violationExists = await this.violationExists(ctx, violationId);
    if (!violationExists) {
        throw new Error(`The violationExists ${violationId} does not exist`);
    }

    const vehicleDetails = await this.readVehicle(ctx, vehicleId);
    const violationDetails = await this.readViolation(ctx, violationId);

    // Matching criteria based on vehicle vehicleId and registrationNumber
    if (vehicleDetails.vehicleId === violationDetails.vehicleId && vehicleDetails.registrationNumber <= violationDetails.registrationNumber) {
           violationDetails.status = 'Fine Issued';

        const updatedVehicleBuffer = Buffer.from(JSON.stringify(violationDetails));
        await ctx.stub.putState(vehicleId, updatedVehicleBuffer);

        return `Vehicle with ${vehicleId} is fined with ${fineamount}`;
    } else {
        return 'Violation does not match the vehicle specifications';
    }
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

