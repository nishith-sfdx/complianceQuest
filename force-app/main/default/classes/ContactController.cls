public with sharing class ContactController {
    
    @AuraEnabled(Cacheable=true)
    public static List<Contact> getContacts() {
         return [
            SELECT Id, Name, Email
            FROM Contact
         ];
    }

    @AuraEnabled
    public static void addRecord(String name, String email) {
        Contact con = new Contact();

        con.LastName = name;
        con.Email = email;

        insert con;
    }

    @AuraEnabled
    public static void DeleteRecord(String Id) {
        Contact con = [SELECT Id FROM Contact WHERE Id = :Id];
         delete con;
    }
}