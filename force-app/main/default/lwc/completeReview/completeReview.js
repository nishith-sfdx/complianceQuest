import { LightningElement, wire, api } from 'lwc';
import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import COMPLAINT_FEEDBACK_OBJECT from '@salesforce/schema/SQX_Complaint_Feedback__c';
import RESOLUTION_FIELD from '@salesforce/schema/SQX_Complaint_Feedback__c.CQ_Resolution__c';

import hasReviewAccess from '@salesforce/apex/FeedbackReviewController.hasReviewAccess';
import completeFeedbackReview from '@salesforce/apex/FeedbackReviewController.completeFeedbackReview';


export default class CompleteReview extends LightningElement {
    @api recordId;

    isProcessing = false;
    hasAccess = false;
    isReviewCompleted = false;

    selectedResolution = '';
    resolutionOptions = [];

    @wire(getObjectInfo, { objectApiName : COMPLAINT_FEEDBACK_OBJECT})
    feedbackObjectInfo;

    @wire(getPicklistValues, { 
        recordTypeId: '$feedbackObjectInfo.data.defaultRecordTypeId',
        fieldApiName: RESOLUTION_FIELD
    })
    resolutionPicklistValues({ error, data}) {
        if (data) {
            this.resolutionOptions = data.values.map(item => ({
                label: item.label,
                value: item.value
            }));
        } else if (error) {
            console.error('Error fetching Picklist values: ', error);
        }
    }

    @wire(hasReviewAccess, { recordId: '$recordId' })
    accessAndRecordCheck({ error, data }) {
        if(data) {
            this.hasAccess = data;
            this.selectedResolution = data.CQ_Resolution__c || '';
            this.isReviewCompleted = (data.CQ_Status__c === 'Resolved');
        } else if (data === null) {
            this.hasAccess = false;
        } else if(error) {
            console.error(error);
        }
    }

    handleResolutionChange(event) {
        this.selectedResolution = event.target.value;
    }

    async saveResolution() {

        if(!this.selectedResolution) {
            this.dispatchEvent(new ShowToastEvent ({
                title: 'Validation Error',
                message: 'Please select a reolution',
                variant: 'error'
            }));

            return;
        }

        this.isProcessing = true;

        try {
            await completeFeedbackReview({
                feedbackId: this.recordId,
                resolution: this.selectedResolution
            });

            this.dispatchEvent( new ShowToastEvent ({
                label: 'Success',
                message: 'Feedback review completed successfully',
                variant: 'success'
            }));

            window.location.reload();
        } catch (error) {
            console.error('Error completing review: ', error);
        }
    }
}