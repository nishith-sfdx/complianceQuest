// FeedbackReviewControllerTest.apxc
@IsTest
private class FeedbackReviewControllerTest {

    @isTest
static void testAccessByOwner() {
    Account acc = new Account(Name = 'Mini Test');
    insert acc;

    SQX_Complaint__c complaint = new SQX_Complaint__c(
        CQ_Title__c = 'Tiny Complaint',
        CQ_SQX_Customer__c = acc.Id,
        Customer_Contact_Email__c = 'test@test.com'
    );
    insert complaint;

    SQX_Complaint_Feedback__c feedback = new SQX_Complaint_Feedback__c(
        CQ_SQX_Related_To__c = complaint.Id,
        CQ_Status__c = 'Customer Success Review',
        OwnerId = UserInfo.getUserId()
    );
    insert feedback;

    SQX_Complaint_Feedback__c result = FeedbackReviewController.hasReviewAccess(feedback.Id);
    System.assertEquals(feedback.Id, result.Id);
}

    @isTest
static void testAccessByQueueMember() {
    // Create dummy Account & Complaint
    Account acc = new Account(Name = 'Queue Test');
    insert acc;

    SQX_Complaint__c complaint = new SQX_Complaint__c(
        CQ_Title__c = 'Queue Complaint',
        CQ_SQX_Customer__c = acc.Id
    );
    insert complaint;

    // Create/ensure queue
    Group queue;
    try {
        queue = [SELECT Id FROM Group WHERE Name = 'Customer Success Team' AND Type = 'Queue' LIMIT 1];
    } catch (Exception e) {
        queue = new Group(Name = 'Customer Success Team', Type = 'Queue');
        insert queue;
    }

    // Add current user to queue
    if ([SELECT COUNT() FROM GroupMember WHERE GroupId = :queue.Id AND UserOrGroupId = :UserInfo.getUserId()] == 0) {
        insert new GroupMember(GroupId = queue.Id, UserOrGroupId = UserInfo.getUserId());
    }

    // Assign feedback to queue
    SQX_Complaint_Feedback__c feedback = new SQX_Complaint_Feedback__c(
        CQ_SQX_Related_To__c = complaint.Id,
        CQ_Status__c = 'Customer Success Review',
        OwnerId = queue.Id
    );
    insert feedback;

    // Validate access
    SQX_Complaint_Feedback__c result = FeedbackReviewController.hasReviewAccess(feedback.Id);
    System.assertEquals(feedback.Id, result.Id);
}

    @isTest
static void testCompleteReview_missingId() {
    try {
        FeedbackReviewController.completeFeedbackReview(null, 'Resolved');
        System.assert(false, 'Should have thrown exception');
    } catch (Exception e) {
        System.assert(e instanceof AuraHandledException);
    }
}

@isTest
static void testCompleteReview_missingResolution() {
    Account acc = new Account(Name = 'X');
    insert acc;
    SQX_Complaint__c complaint = new SQX_Complaint__c(CQ_Title__c = 'X', CQ_SQX_Customer__c = acc.Id);
    insert complaint;
    SQX_Complaint_Feedback__c feedback = new SQX_Complaint_Feedback__c(CQ_SQX_Related_To__c = complaint.Id, CQ_Status__c = 'Customer Success Review');
    insert feedback;

    try {
        FeedbackReviewController.completeFeedbackReview(feedback.Id, '');
        System.assert(false, 'Should have thrown exception');
    } catch (Exception e) {
        System.assert(e instanceof AuraHandledException);
    }
}

@isTest
static void testCompleteReview_alreadyResolved() {
    Account acc = new Account(Name = 'Y');
    insert acc;
    SQX_Complaint__c complaint = new SQX_Complaint__c(CQ_Title__c = 'Y', CQ_SQX_Customer__c = acc.Id);
    insert complaint;
    SQX_Complaint_Feedback__c feedback = new SQX_Complaint_Feedback__c(CQ_SQX_Related_To__c = complaint.Id, CQ_Status__c = 'Resolved');
    insert feedback;

    try {
        FeedbackReviewController.completeFeedbackReview(feedback.Id, 'Resolution');
        System.assert(false, 'Should have thrown exception');
    } catch (Exception e) {
        System.assert(e instanceof AuraHandledException);
    }
}

@isTest
static void testCompleteReview_success() {
    Account acc = new Account(Name = 'Z');
    insert acc;
    SQX_Complaint__c complaint = new SQX_Complaint__c(CQ_Title__c = 'Z', CQ_SQX_Customer__c = acc.Id);
    insert complaint;
    SQX_Complaint_Feedback__c feedback = new SQX_Complaint_Feedback__c(CQ_SQX_Related_To__c = complaint.Id, CQ_Status__c = 'Customer Success Review');
    insert feedback;

    FeedbackReviewController.completeFeedbackReview(feedback.Id, 'Everything is fine');

    SQX_Complaint_Feedback__c updated = [SELECT CQ_Status__c, CQ_Resolution__c FROM SQX_Complaint_Feedback__c WHERE Id = :feedback.Id];
    System.assertEquals('Resolved', updated.CQ_Status__c);
    System.assertEquals('Everything is fine', updated.CQ_Resolution__c);
}

    
}