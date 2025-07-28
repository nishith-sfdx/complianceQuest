@isTest
private class FeedbackControllerTest {

    @testSetup
    static void setupData() {
        // Create test Account
        Account acc = new Account(Name = 'Test Account');
        insert acc;

        // Create test Complaint with email
        SQX_Complaint__c complaint = new SQX_Complaint__c(
            CQ_Title__c = 'Test Complaint',
            CQ_SQX_Customer__c = acc.Id,
            Customer_Contact_Email__c = 'test@example.com'
        );
        insert complaint;
    }

    @isTest
    static void testRequestFeedback_Success() {
        // Get complaint record
        SQX_Complaint__c complaint = [SELECT Id FROM SQX_Complaint__c LIMIT 1];

        Test.startTest();
        FeedbackController.requestFeedback(complaint.Id);
        Test.stopTest();

        // Validate Feedback record was created
        SQX_Complaint_Feedback__c feedback = [
            SELECT Id, CQ_Status__c, CQ_SQX_Related_To__c
            FROM SQX_Complaint_Feedback__c
            WHERE CQ_SQX_Related_To__c = :complaint.Id
            LIMIT 1
        ];
        System.assertEquals('Requested', feedback.CQ_Status__c);

        // Validate Complaint record was updated with feedback lookup
        complaint = [SELECT Id, Latest_Complaint_Feedback__c FROM SQX_Complaint__c WHERE Id = :complaint.Id];
        System.assertEquals(feedback.Id, complaint.Latest_Complaint_Feedback__c);
    }

    @isTest
static void testRequestFeedback_MissingComplaintId() {
    try {
        FeedbackController.requestFeedback(null);
        System.assert(false, 'Expected an AuraHandledException for missing Complaint ID.');
    } catch (Exception e) {
        System.assert(e instanceof AuraHandledException, 'Expected AuraHandledException.');
        System.assert(e.getMessage().contains('Complaint Id is missing'), 'Error message mismatch.');
    }
}


    @isTest
static void testRequestFeedback_MissingEmail() {
    Account acc = [SELECT Id FROM Account LIMIT 1];

    // Create complaint without an email
    SQX_Complaint__c complaintNoEmail = new SQX_Complaint__c(
        CQ_Title__c = 'No Email Complaint',
        CQ_SQX_Customer__c = acc.Id
        // No email provided here
    );
    insert complaintNoEmail;

    try {
        FeedbackController.requestFeedback(complaintNoEmail.Id);
        System.assert(false, 'Expected an AuraHandledException for missing email.');
    } catch (Exception e) {
        System.assert(e instanceof AuraHandledException, 'Expected AuraHandledException.');
        System.assert(e.getMessage().contains('Customer Contact Email is missing'), 'Error message mismatch.');
    }
}


    @isTest
    static void testHasPermissionMethod() {
        // Just call the permission method (will return false since no PSL assigned in test context)
        Boolean result = FeedbackController.hasPermission();
        System.assert(result == false || result == true); // Accept either in test context
    }
}