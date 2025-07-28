public without sharing class FeedbackFormController {
    
    @AuraEnabled(Cacheable=true)
    public static SQX_Complaint_Feedback__c getFeedbackFormDetails(Id feedbackId){
        
        if(feedbackId == null) {
             throw new AuraHandledException('Feedback Id cannot be null');
        }

        try {

            return [
                SELECT Id, Name, CQ_SQX_Related_To__c, CQ_SQX_Related_To__r.Name, 
                        CQ_SQX_Related_To__r.CQ_Title__c, CQ_Issue_Resolved__c, CQ_Experience__c,
                        CQ_Comment__c, CQ_Status__c
                FROM SQX_Complaint_Feedback__c
                WHERE Id = :feedbackId
                LIMIT 1
            ];
            
        } catch (QueryException qe) {
            throw new AuraHandledException(qe.getMessage());
        }
    }

    @AuraEnabled
    public static void submitCustomerFeedback(SQX_Complaint_Feedback__c feedbackToUpdate) {

        if(feedbackToUpdate == null || feedbackToUpdate.Id == null) {
            throw new AuraHandledException('Feedback record datais missing or invalid');
        }

        SQX_Complaint_Feedback__c existingFeedback;

        try {
            existingFeedback = [
                SELECT Id, CQ_Status__c, OwnerId
                FROM SQX_Complaint_Feedback__c
                WHERE Id = :feedbackToUpdate.Id
                LIMIT 1
            ];

        } catch (QueryException qe) {
            throw new AuraHandledException('Existing feedback record not found' + qe.getMessage());
        }

        if(existingFeedback == null) {
            throw new AuraHandledException('Feedback record with Id: ' + feedbackToUpdate.Id + 'does not exist');
        }

        if(existingFeedback.CQ_Status__c != 'Requested') {
            throw new AuraHandledException('Feedback has already been submitted or reviewed.');
        }

        existingFeedback.CQ_Issue_Resolved__c = feedbackToUpdate.CQ_Issue_Resolved__c;
        existingFeedback.CQ_Experience__c = feedbackToUpdate.CQ_Experience__c;
        existingFeedback.CQ_Comment__c = feedbackToUpdate.CQ_Comment__c;
        
        existingFeedback.CQ_Status__c = 'Customer Success Review';

        //Set owner to 'Customer Success Team' queue
        //You must ensure this Queue exists in your Salesforce org.
        //Query the Queue Id dynamically to avoid hardcoding.

        Id customerSuccessQueueId;

        try {
            
            Group customerSuccessQueue = [
                SELECT Id 
                FROM Group
                WHERE Name = 'Customer Success Team'
                AND Type = 'Queue'
                LIMIT 1
            ];
            customerSuccessQueueId = customerSuccessQueue.Id;
        } catch (QueryException qe) {
            throw new AuraHandledException('Customer success queue not found');
        }

        existingFeedback.OwnerId = customerSuccessQueueId;

        try {
            update existingFeedback;
        } catch (DmlException dme) {
            throw new AuraHandledException('Error saving feedback: ' + dme.getMessage());
        }
    }
}