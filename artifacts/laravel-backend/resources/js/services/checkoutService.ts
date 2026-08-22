import axios from 'axios';

export type PricingQuote = {
    subtotal:number; promotionDiscount:number; couponDiscount:number; shippingTotal:number;
    installationTotal:number; grandTotal:number; shippingAddressRequired:boolean; currency:string;
    coupon?:{code:string;discount:number}|null;
};

export async function validateCheckout(shippingCity:string,couponCode?:string):Promise<PricingQuote>{
    const {data}=await axios.post('/api/v1/checkout/validate',{shipping_city:shippingCity,coupon_code:couponCode||null});
    return data.quote;
}
