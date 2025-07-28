public with sharing class FeedbackController {
    
    @AuraEnabled(Cacheable=true)
    public static Boolean hasPermission() {

        return FeatureManagement.checkPermission('Customer_Success_Representative');
    }

    @AuraEnabled
    public static void requestFeedback(Id complaintId){
        try {

            if (complaintId == null) {
                throw new AuraHandledException('Complaint Id is missing');
            }
            
            // 1. Fetch complaint record

            SQX_Complaint__c complaint = [
                SELECT Id, Name, CQ_Title__c, Customer_Contact_Email__c
                FROM SQX_Complaint__c
                WHERE Id = :complaintId
                LIMIT 1
            ];

            String recipientEmail = complaint.Customer_Contact_Email__c;

            if (String.isBlank(recipientEmail)) {
                throw new AuraHandledException('Customer Contact Email is missing');
            }
            // 2. Create complaint feedback record

            SQX_Complaint_Feedback__c feedback = new SQX_Complaint_Feedback__c(
                CQ_SQX_Related_To__c = complaint.Id, 
                CQ_Status__c = 'Requested'
            );

            if(feedback != null) {
                insert feedback;
            }

            // 3. Update the Complaint record with the lookup to the new Complaint Feedback record
            complaint.Latest_Complaint_Feedback__c = feedback.Id;

            if (complaint != null) {
                update complaint;
            }

            // Send Email
            sendFeedbackEmail(complaint, feedback, recipientEmail); //sending both records
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    private static void sendFeedbackEmail(SQX_Complaint__c complaint, SQX_Complaint_Feedback__c feedback, String recipientEmail) {

        try {

            String communityBaseURL = 'https://mindful-wolf-f2f4m9-dev-ed.trailblaze.my.site.com/feedback';

            // Generate feedback form link
            String feedbackURL = communityBaseURL + '/s?id=' + feedback.Id;

            System.debug('Generated Feedback URL: ' + feedbackURL); // debugging

            // Prepare Email

            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new String[] { recipientEmail });
            mail.setSubject('Please provide your feedback for Complaint: ' + complaint.Name);
            mail.setHtmlBody(
                'Dear Customer,<br/><br/>' +
                'We value your feedback. Please click the link below to share your thoughts regarding complaint <b>' + 
                complaint.Name + '</b>.<br/><br/>' + 
                '<a href="' + feedbackURL + '" target="_blank">Submit Feedback Here</a><br/><br/>' + 
                'Alternatively, you can copy and paste this link into your browser:<br/>' + 
                feedbackURL + '<br/><br/>' +
                'Thank you,<br/>' +
                'The Customer Success Team'
            );

            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}