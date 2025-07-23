import { RefinedParams } from "k6/http";

export type LoadPayload = {
    params: RefinedParams<'text'>
}