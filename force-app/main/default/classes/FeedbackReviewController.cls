public with sharing class FeedbackReviewController {
    
    @AuraEnabled(Cacheable=true)
    public static Boolean hasReviewAccess(Id recordId) {

        if(recordId == null) {
            throw new AuraHandledException('RecordId is null ');
        }

        Id currentUserID = UserInfo.getUserId();

        // 1. Checking if the current user is the owner of the record
        SQX_Complaint_Feedback__c feedback = [
            SELECT Id, OwnerId
            FROM SQX_Complaint_Feedback__c
            WHERE Id = :recordId
            LIMIT 1
        ];

        if (feedback != null && feedback.OwnerId == currentUserID) {
            return true;
        }

        // 2. Checking if the current user is a member of the 'Customer Success Team' Queue
            
            // First, get the Id of the 'Customer Success Team' Queue
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
                throw new AuraHandledException('Customer Success Team queue not found: ' + qe.getMessage());
            }

            if(customerSuccessQueueId != null) {
                
                // checking if the user is a member of the queue
                try {
                    
                    List<GroupMember> queueMembers = [
                        SELECT Id
                        FROM GroupMember
                        WHERE GroupId = :customerSuccessQueueId
                        AND UserorGroupId = :currentUserID
                        LIMIT 1
                    ];

                    if(!queueMembers.isEmpty()) {
                        return true;
                    }
                } catch (QueryException qe) {
                    throw new AuraHandledException('Error: ' + qe.getMessage());
                }
            }

        return false;
    }

    @AuraEnabled
    public static void completeFeedbackReview(Id feedbackId, String resolution){
        
        if(feedbackId == null) {
            throw new AuraHandledException('Feedback Id is missing');
        }

        if(String.isBlank(resolution)) {
            throw new AuraHandledException('Feedback resolution is missing');
        }
        try {
            SQX_Complaint_Feedback__c feedbackToUpdate = [
                SELECT Id, CQ_Status__c, CQ_Resolution__c
                FROM SQX_Complaint_Feedback__c
                WHERE Id = :feedbackId
                LIMIT 1
            ];

            if(feedbackToUpdate == null) {
                throw new AuraHandledException('Complaint Feedback record not found with ID: ' + feedbackId);
            }

            if(feedbackToUpdate.CQ_Status__c == 'Resolved') {
                throw new AuraHandledException('This feedback has already been resolved.');
            }

            feedbackToUpdate.CQ_Resolution__c = resolution;
            feedbackToUpdate.CQ_Status__c = 'Resolved';

            
            update feedbackToUpdate;
            

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}