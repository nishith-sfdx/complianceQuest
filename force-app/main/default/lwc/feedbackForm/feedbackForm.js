// feedbackForm.js
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

    isLoading = true; // Renamed from 'loaded' for consistency and clarity
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
        console.log('connectedCallback: feedbackRecordId =', this.feedbackRecordId);

        if(this.feedbackRecordId) {
            this.loadFeedbackFormDetails();
        } else {
            this.isLoading = false; // Stop loading if no ID
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'No feedback ID provided in the URL. Please use a valid link.',
                    variant: 'error'
                })
            );
        }
    }

    @wire(getObjectInfo, { objectApiName: COMPLAINT_FEEDBACK_OBJECT})
    feedbackObjectInfo;

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
            console.log('Issue Resolved Picklist Options:', this.issueResolvedOptions);
        } else if (error) {
            console.error('Error fetching Issue Resolved picklist values: ', error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Could not load "Is the Issue Resolved?" options.',
                    variant: 'error'
                })
            );
        }
    }

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
            console.log('Your Experience Picklist Options:', this.yourExperienceOptions);
        } else if(error) {
            console.error('Error fetching Your Experience picklist values: ', error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Could not load "Your Experience" options.',
                    variant: 'error'
                })
            );
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
        console.log('loadFeedbackFormDetails: Fetching details for ID:', this.feedbackRecordId);
        try {
            this.feedbackRecord = await getFeedbackFormDetails({ feedbackId: this.feedbackRecordId});
            console.log('loadFeedbackFormDetails: Apex returned feedbackRecord:', JSON.stringify(this.feedbackRecord, null, 2));

            if (this.feedbackRecord) {
                // Check for existence of related record before accessing properties
                if (this.feedbackRecord.CQ_SQX_Related_To__r) {
                    this.complaintNumber = this.feedbackRecord.CQ_SQX_Related_To__r.Name;
                    this.complaintTitle = this.feedbackRecord.CQ_SQX_Related_To__r.CQ_Title__c;
                    console.log('Complaint Number:', this.complaintNumber);
                    console.log('Complaint Title:', this.complaintTitle);
                } else {
                    console.warn('feedbackRecord.CQ_SQX_Related_To__r is null or undefined. Check Apex query and permissions.');
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Warning',
                            message: 'Related Complaint details could not be loaded. Check permissions.',
                            variant: 'warning'
                        })
                    );
                }

                // Pre-populate feedback fields
                this.issueResolved = this.feedbackRecord.CQ_Issue_Resolved__c || '';
                this.yourExperience = this.feedbackRecord.CQ_Experience__c || '';
                this.additionalComment = this.feedbackRecord.CQ_Comment__c || '';
                console.log('Feedback fields populated:', {
                    issueResolved: this.issueResolved,
                    yourExperience: this.yourExperience,
                    additionalComment: this.additionalComment
                });

                console.log('Current Feedback Status:', this.feedbackRecord.CQ_Status__c);

                if(this.feedbackRecord.CQ_Status__c !== 'Requested') {
                    this.isSubmitted = true; // Show Thank you message if already submitted/reviewed
                    this.feedbackRecord = null; // Clear record to prevent form display
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Info',
                            message: 'This feedback has already been submitted or reviewed.',
                            variant: 'info'
                        })
                    );
                }
            } else {
                console.error('loadFeedbackFormDetails: feedbackRecord is null after Apex call.');
                this.feedbackRecord = null; // Ensure form doesn't display if record not found
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: 'Feedback record not found or you do not have access.',
                        variant: 'error'
                    })
                );
            }
        } catch (error) {
            console.error('loadFeedbackFormDetails: Error loading feedback form details: ', error);
            this.feedbackRecord = null; // Ensure form doesn't display if error
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error Loading Form',
                    message: error.body?.message || error.message || 'Could not load feedback form. Please check the link or permissions.',
                    variant: 'error'
                })
            );
        } finally {
            this.isLoading = false; // Always set loading to false once data processing is complete
            console.log('loadFeedbackFormDetails: isLoading set to false.');
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
                message: 'Please fill in all required fields.',
                variant: 'error'
            }));
            return;
        }

        this.isSubmitting = true;
        console.log('handleSubmit: Submitting feedback...');

        try {
            const feedbackData = {
                Id: this.feedbackRecordId,
                CQ_Issue_Resolved__c: this.issueResolved,
                CQ_Experience__c: this.yourExperience,
                CQ_Comment__c: this.additionalComment // CORRECTED API NAME
            };
            console.log('handleSubmit: Data to send to Apex:', JSON.stringify(feedbackData, null, 2));

            await submitCustomerFeedback({ feedbackToUpdate: feedbackData });
            console.log('handleSubmit: Feedback submitted successfully!');

            this.isSubmitted = true; // Show Thank you message.
            this.feedbackRecord = null; // Clear form data
            this.dispatchEvent(new ShowToastEvent({
                title: 'Success',
                message: 'Your feedback has been successfully submitted!',
                variant: 'success'
            }));
        } catch (error) {
            console.error('handleSubmit: Error submitting feedback: ', error);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Submission Error',
                message: error.body?.message || error.message || 'An unexpected error occurred while submitting your feedback.',
                variant: 'error'
            }));
        } finally {
            this.isSubmitting = false; // Always reset submitting state
            console.log('handleSubmit: isSubmitting set to false.');
        }
    }
}