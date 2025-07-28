import { LightningElement, wire } from 'lwc';
import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import COMPLAINT_FEEDBACK_OBJECT from '@salesforce/schema/SQX_Complaint_Feedback__c';
import ISSUE_RESOLVED_FIELD from '@salesforce/schema/SQX_Complaint_Feedback__c.CQ_Issue_Resolved__c';
import EXPERIENCE_FIELD from '@salesforce/schema/SQX_Complaint_Feedback__c.CQ_Experience__c';
import STATUS_FIELD from '@salesforce/schema/SQX_Complaint_Feedback__c.CQ_Status__c';

import getFeedbackFormDetails from '@salesforce/apex/FeedbackFormController.getFeedbackFormDetails';
import submitCustomerFeedback from '@salesforce/apex/FeedbackFormController.submitCustomerFeedback';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class FeedbackForm extends LightningElement {

    feedbackRecordId;

    loaded = false;
    isSubmitted = false;
    isSubmitting = false;

    complaintNumber = '';
    complaintTitle = '';
    issueResolved = '';
    yourExperience = '';
    additionalComment = '';

    issueResolvedOptions = [];
    yourExperienceOptions = [];

    feedbackRecord;

    connectedCallback() {
        const params = new URLSearchParams(window.location.search);
        this.feedbackRecordId = params.get('id');

        if(this.feedbackRecordId) {
            this.loadFeedbackFormDetails();
        } else {
            this.loaded = true;
        }

    }

    // wire variable to get object info for Complaint Feedback object
    @wire(getObjectInfo, { objectApiName: COMPLAINT_FEEDBACK_OBJECT})
    feedbackObjectInfo;

    // wire function to get picklist values for 'Is the Issue Resolved?' field
    @wire(getPicklistValues, { 
        recordTypeId: '$feedbackObjectInfo.data.defaultRecordTypeId',
        fieldApiName: ISSUE_RESOLVED_FIELD
    })
    issueResolvedPicklistValues({ error, data }) {
        if (data) {
            this.issueResolvedOptions = data.values.map(item => ({
                label: item.label,
                value: item.value
            }));
        } else if (error) {
            console.error('Error fetching Issue Resolved picklist values: ', error);
        }
    }

    //wire function to get picklist values for 'Your Experience' field
    @wire(getPicklistValues, {
        recordTypeId: '$feedbackObjectInfo.data.defaultRecordTypeId',
        fieldApiName: EXPERIENCE_FIELD
    })
    yourExperiencePicklistValues({ error, data }) {
        if(data) {
            this.yourExperienceOptions = data.values.map(item => ({
                label: item.label,
                value: item.value
            }));
        } else if(error) {
            console.log('Error fetching Your Experience picklist values: ', error);
        }
    }

    handleResolvedChange(event) {
        this.issueResolved = event.detail.value;
    }

    handleYourExperienceChange(event) {
        this.yourExperience = event.detail.value;
    }

    handleCommentChange(event) {
        this.additionalComment = event.detail.value;
    }

    async loadFeedbackFormDetails() {
         
        try {

            this.feedbackRecord = await getFeedbackFormDetails({ feedbackId: this.feedbackRecordId});

            if (this.feedbackRecord) {

                this.complaintNumber = this.feedbackRecord.CQ_SQX_Related_To__r.Name;
                this.complaintTitle = this.feedbackRecord.CQ_SQX_Related_To__r.CQ_Title__c;

                //Pre-populate feedback fields if they already have values (e.g. if re-opening the form)
                this.issueResolved = this.feedbackRecord.CQ_Issue_Resolved__c || '';
                this.yourExperience = this.feedbackRecord.CQ_Experience__c || '';
                this.additionalComment = this.feedbackRecord.CQ_Comment__c || '';

                console.log(this.complaintNumber + ' ' + this.complaintTitle + ' ' + this.issueResolved + 
                            ' ' + this.yourExperience + ' ' + this.additionalComment);
                alert(this.complaintNumber + ' ' + this.complaintTitle + ' ' + this.issueResolved + 
                            ' ' + this.yourExperience + ' ' + this.additionalComment);

                if(this.feedbackRecord.CQ_Status__c !== 'Requested') {
                    this.isSubmitted = true; // Show Thank you message as if already submitted
                    this.feedbackRecord = null;
                }
            } else {
                this.feedbackRecord = null;
            }
        } catch (error) {
            console.error('Error loading feedback form details: ', error);
        }
    }

    async handleSubmit() {

        // Basic validation

        const allValid = [...this.template.querySelectorAll('lightning-combobox')]
            .reduce((validSoFar, inputCmp) => {
                inputCmp.reportValidity();
                return validSoFar && inputCmp.checkValidity();
            }, true);
            
        if (!allValid) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Validation Error',
                message: 'Please fill in all required fields',
                variant: 'error'
            }));
            return;
        }

        this.isSubmitting = true;

        const feedbackData = {
            Id: this.feedbackRecordId,
            CQ_Issue_Resolved__c: this.issueResolved,
            CQ_Experience__c: this.yourExperience,
            CQ_Commment__c: this.additionalComment
        };

        try {
            await submitCustomerFeedback({ feedbackToUpdate: feedbackData });

            this.dispatchEvent(new ShowToastEvent({
                title: 'Thank You!',
                message: 'Your Feedback was submitted successfully',
                variant: 'success'
            }));

            this.isSubmitted = true; // Show Thank you message.
            this.feedbackRecord = null;
        } catch (error) {
            console.log('Error is:', error);
        }
    }
}