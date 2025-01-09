export enum ERoles {

}

export interface IUserAddress {
    street: string,
    suite: string,
    city: string,
    zipcode: string,
    geo: {
        lat: string,
        lng: string
    }
}
export interface IUserCompany {
    name: string,
    catchPhrase: string,
    bs: string
}

export interface IUser {
    id: number,
    name: string,
    email: string,
    address: IUserAddress,
    phone: string,
    website: string,
    company: IUserCompany,
    language: string,
    image: string,
}

export type IUserIdentification = IUser['id'];

export type IUserProfile = Pick<IUser, 'id' | 'name' | 'email' | 'phone'>;

export interface IUserForm extends IUserProfile, Pick<IUser, 'language' | 'image'> {
    companyname: string,
    companyCatchPhrase: string,
}
