import { LightningElement, wire, track } from 'lwc';
import getContacts from '@salesforce/apex/ContactController.getContacts';
import addRecord from '@salesforce/apex/ContactController.addRecord';
import DeleteRecord from '@salesforce/apex/ContactController.DeleteRecord';

export default class AddAndDeleteRecord extends LightningElement {

    records;
    error;
    @track nm;
    @track em;

    @wire(getContacts)
    wiredContacts({data, error}) {
        if(data) {
            this.records = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.records = undefined;
        }
    }

    handleAddClick() {
        addRecord({
            nm: this.nm,
            em: this.em
        });
    }

    handleDeleteClick() {

        DeleteRecord({
            Id: this.detail.Id
        });
    }

    handleNameChange() {
        this.nm = event.target.value;
    }

    handleEmailChange() {
        this.em = event.target.value;
    }
}