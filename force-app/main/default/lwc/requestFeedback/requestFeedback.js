import { LightningElement, api, wire } from 'lwc';
import hasPermission from '@salesforce/apex/FeedbackController.hasPermission';
import requestFeedback from '@salesforce/apex/FeedbackController.requestFeedback';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class RequestFeedback extends LightningElement {

    @api recordId;
    hasAccess = false;
    isProcessing = false;

    @wire(hasPermission)
    permissionCheck({ error, data}) {
        if (data === true) {
            this.hasAccess = true;
        } else if (error) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'Failed to check user permissions',
                variant: 'error'
            }));
        }
    }

    async handleClick() {

        if (this.isProcessing) {
            return; // Prevent multiple clicks
        }

        this.isProcessing = true; // Set processing flag to true

        try {

            await requestFeedback({ complaintId: this.recordId});

            this.dispatchEvent(new ShowToastEvent({
                title: 'Success',
                message: 'Feedback request sent successfully! A new Complaint Feedback record has been created and linked.',
                variant: 'success'
            }));

            this.isProcessing = false; // Set processing flag to false

        } catch (error) {

            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: error.body?.message || error.message,
                variant: 'error'
            }));
        }
    }
}