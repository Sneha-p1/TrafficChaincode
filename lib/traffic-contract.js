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

    async accidentExists(ctx, accidentId) {
        const buffer = await ctx.stub.getState(accidentId);
        return (!!buffer && buffer.length > 0);
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



    // TMA creates a traffic violation Details
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

    
    


    

//  // TMA creates accident report and passes it to Law Enforcement
// async createAccidentreport(ctx, vehicleId, registrationNumber, accidentDetails) {
//     const mspID = ctx.clientIdentity.getMSPID();
//     if (mspID === 'TrafficManagementMSP') {
//         const accident = {
//             vehicleId,
//             registrationNumber,
//             accidentDetails,
//             status: 'Pending',
//             assetType: 'AccidentReport'
//         };

//         const transientData = ctx.stub.getTransient();
//         if (transientData.size === 0 || !transientData.has('vehicleId')
//             || !transientData.has('registrationNumber') || !transientData.has('accidentDetails')
         
//         ) {
//             throw new Error('The expected key was not specified in transient data. Please try again.');
//         }

//         accident.vehicleId = transientData.get('vehicleId').toString();
//         accident.registrationNumber = transientData.get('registrationNumber').toString();
//         accident.accidentDetails = transientData.get('accidentDetails').toString();
//         violation.assetType = 'accident';


//         const collectionName = await getCollectionName(ctx);
//         await ctx.stub.putPrivateData(collectionName, vehicleId, Buffer.from(JSON.stringify(vehicleId)));
//     } else {
//         return `Organisation with mspid ${mspID} cannot perform this action`;
//     }
// }

// async readAccidentReport(ctx, vehicleId) {
//     const exists = await this.accidentReport(ctx, vehicleId);
//     if (!exists) {
//         throw new Error(`The Vehicle ${vehicleId} does not exist`);
//     }

//     let privateDataString;
//     const collectionName = await getCollectionName(ctx);
//     const privateData = await ctx.stub.getPrivateData(collectionName, vehicleId);
//     privateDataString = JSON.parse(privateData.toString());
//     return privateDataString;
// }
    


       

    // TMA creates accident report and passes it to Law Enforcement
    async createAccidentReport(ctx, accidentId, registrationNumber, accidentDetails) {
        const mspID = ctx.clientIdentity.getMSPID();
        if (mspID === 'TrafficManagementMSP') {
            const exists = await this.accidentExists(ctx, accidentId);
            if (exists) {
                throw new Error(`The vehicle ${accidentId} already exists`);
            }
            const report = {
                accidentId,
                registrationNumber,
                accidentDetails,
                status: 'Reported',
                assetType: 'accidentReport'
            };
            const buffer = Buffer.from(JSON.stringify(report));
            await ctx.stub.putState(accidentId, buffer);
        } else {
            return `User under MSP: ${mspID} cannot perform this action`;
        }
    }

    async readAccidentReport(ctx, accidentId) {
        const exists = await this.accidentExists(ctx, accidentId);
        if (!exists) {
            throw new Error(`The accident report with ID ${accidentId} does not exist`);
        }
        const buffer = await ctx.stub.getState(accidentId);
        return JSON.parse(buffer.toString());
      
    }


    async searchAccidentReport(ctx, accidentId, registrationNumber) {
        const mspID = ctx.clientIdentity.getMSPID();
        if (mspID !== 'LawEnforcementMSP') {
            throw new Error(`Only Law Enforcement can search accident reports.`);
        }
    
        // Retrieve accident report from public state database
        const accidentData = await ctx.stub.getState(accidentId);
    
        if (!accidentData || accidentData.length === 0) {
            return `No accident report found for accident ID: ${accidentId}`;
        }
    
        const accidentReport = JSON.parse(accidentData.toString());
    
        // Verify if the registration number matches
        if (accidentReport.registrationNumber !== registrationNumber) {
            return `No matching accident report found for registration number: ${registrationNumber}`;
        }
    
        return `Accident report found: Vehicle with registration number ${registrationNumber} was involved in an accident, report ID: ${accidentId}.`;
    }
    




    // Insurance Company matches accident records with MVD data
    // async matchInsuranceDetails(ctx, reportId, registrationNumber) {
    //     const mspID = ctx.clientIdentity.getMSPID();
    //     if (mspID === 'InsuranceCompanyMSP') {
    //         const reportBuffer = await ctx.stub.getState(reportId);
    //         if (!reportBuffer || reportBuffer.length === 0) {
    //             throw new Error(`The accident report ${reportId} does not exist`);
    //         }
    //         const vehicleQueryString = {
    //             selector: {
    //                 assetType: 'vehicle',
    //                 registrationNumber: registrationNumber
    //             }
    //         };
    //         let resultIterator = await ctx.stub.getQueryResult(JSON.stringify(vehicleQueryString));
    //         let vehicleDetails = await this._getAllResults(resultIterator);

    //         return {
    //             accidentReport: JSON.parse(reportBuffer.toString()),
    //             matchedVehicleDetails: vehicleDetails
    //         };
    //     } else {
    //         return `User under MSP: ${mspID} cannot perform this action`;
    //     }
    // }



    async giveInsurance(ctx, accidentId, registrationNumber) {
        const mspID = ctx.clientIdentity.getMSPID();
        if (mspID !== 'InsuranceCompanyMSP') {
            throw new Error(`Only the Insurance Company can grant insurance based on an accident report.`);
        }
    
        // Retrieve accident report from public state database
        const accidentData = await ctx.stub.getState(accidentId);
    
        if (!accidentData || accidentData.length === 0) {
            return `No accident report found for accident ID: ${accidentId}`;
        }
    
        const accidentReport = JSON.parse(accidentData.toString());
    
        // Verify if the registration number matches
        if (accidentReport.registrationNumber !== registrationNumber) {
            return `No matching accident report found for registration number: ${registrationNumber}`;
        }
    
        return `Insurance has been granted for the vehicle with registration number ${registrationNumber}, based on accident report ID: ${accidentId}.`;
    }



    async grantInsuranceForAccident(ctx, accidentId, registrationNumber) {
        const mspID = ctx.clientIdentity.getMSPID();
        if (mspID !== 'InsuranceCompanyMSP') {
            throw new Error(`Only the Insurance Company can grant insurance based on an accident report.`);
        }
    
        // Retrieve the accident report from the ledger
        const accidentData = await ctx.stub.getState(accidentId);
        if (!accidentData || accidentData.length === 0) {
            throw new Error(`No accident report found for ID: ${accidentId}`);
        }
    
        const accidentReport = JSON.parse(accidentData.toString());
    
        // Verify if the registration number matches in the accident report
        if (accidentReport.registrationNumber !== registrationNumber) {
            throw new Error(`No matching accident report found for registration number: ${registrationNumber}`);
        }
    
        // Query the vehicle details to check if insurance can be granted
        const vehicleQueryString = {
            selector: {
                assetType: 'vehicle',
                registrationNumber: registrationNumber
            }
        };
    
        let resultIterator = await ctx.stub.getQueryResult(JSON.stringify(vehicleQueryString));
        let vehicleDetails = await this._getAllResults(resultIterator);
    
        if (!vehicleDetails || vehicleDetails.length === 0) {
            throw new Error(`No vehicle details found for registration number: ${registrationNumber}`);
        }
    
        // Check for conditions to grant insurance (you can add more checks as needed)
        const insuranceStatus = {
            registrationNumber: registrationNumber,
            accidentId: accidentId,
            status: "Insurance Granted",
            details: vehicleDetails,
            accidentDetails: accidentReport
        };
    
        // Save the insurance status on the ledger for future reference
        const insuranceKey = `insurance_${registrationNumber}_${accidentId}`;
        await ctx.stub.putState(insuranceKey, Buffer.from(JSON.stringify(insuranceStatus)));
    
        return `Insurance has been granted for the vehicle with registration number ${registrationNumber}, based on accident report ID: ${accidentId}.`;
    }
    









    async queryAllVehicles(ctx) {
        const queryString = {
            selector: {
                assetType: 'vehicle'
            }
        };

        let resultIterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        let result = await this._getAllResults(resultIterator);
        return JSON.stringify(result)

    }

    async getVehiclesByRange(ctx, startKey, endKey) {
        let resultIterator = await ctx.stub.getStateByRange(startKey, endKey);
        let result = await this._getAllResults(resultIterator);
        return JSON.stringify(result)
    }

    async getVehicleHistory(ctx, vehicleId) {
        let resultIterator = await ctx.stub.getHistoryForKey(vehicleId)
        let result = await this._getAllResults(resultIterator, true);
        return JSON.stringify(result)
    }

    async _getAllResults(iterator, isHistory) {
        let allResult = [];

        let res = await iterator.next();
        while (!res.done) {
            if (res.value && res.value.value.toString()) {
                let jsonRes = {};
                if (isHistory && isHistory === true) {
                    jsonRes.TxId = res.value.txId
                    jsonRes.Timestamp = res.value.timestamp
                    jsonRes.Record = JSON.parse(res.value.value.toString())
                }
                else {
                    jsonRes.Key = res.value.key;
                    jsonRes.Record = JSON.parse(res.value.value.toString());
                }
                allResult.push(jsonRes)
            }
            res = await iterator.next()
        }
        await iterator.close()
        return allResult
    }


}

module.exports = TrafficContract;

