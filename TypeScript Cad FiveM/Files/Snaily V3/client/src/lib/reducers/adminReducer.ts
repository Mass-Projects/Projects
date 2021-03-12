import Citizen from "../../interfaces/Citizen";
import Code10 from "../../interfaces/Code10";
import Company from "../../interfaces/Company";
import Officer from "../../interfaces/Officer";
import PenalCode from "../../interfaces/PenalCode";
import State from "../../interfaces/State";
import User from "../../interfaces/User";
import { ExpungementRequest } from "../actions/court";
import {
  BAN_MEMBER,
  DELETE_CITIZEN,
  DELETE_COMPANY,
  GET_CITIZENS,
  GET_COMPANIES,
  GET_MEMBERS,
  GET_MEMBER_BY_ID,
  UN_BAN_MEMBER,
  UPDATE_MEMBER_PERMS,
  ACCEPT_USER,
  DECLINE_USER,
  GET_ALL_OFFICERS,
  GET_OFFICER_BY_ID,
  ACCEPT_OR_DECLINE_REQUEST,
  GET_ALl_EXPUNGEMENT_REQUESTS,
  GET_10_CODES,
  CREATE_10_CODE,
  DELETE_10_CODE,
  DELETE_PENAL_CODE,
  GET_PENAL_CODES,
  SET_ADMIN_LOADING,
} from "../types";

const initState: State["admin"] = {
  error: null,
  companies: [],
  members: [],
  citizens: [],
  officers: [],
  member: null,
  officer: null,
  expungementRequests: [],
  codes: [],
  penalCodes: [],
  loading: false,
};

type Actions =
  | {
      type: typeof GET_COMPANIES;
      companies: Company[];
    }
  | {
      type: typeof DELETE_COMPANY;
      companies: Company[];
    }
  | {
      type: typeof GET_CITIZENS;
      citizens: Citizen[];
    }
  | {
      type: typeof DELETE_CITIZEN;
      citizens: Citizen[];
    }
  | {
      type: typeof GET_MEMBERS;
      members: User[];
    }
  | {
      type: typeof GET_MEMBER_BY_ID;
      member: User;
    }
  | {
      type: typeof UPDATE_MEMBER_PERMS;
      member: User;
    }
  | {
      type: typeof BAN_MEMBER;
      member: User;
    }
  | {
      type: typeof UN_BAN_MEMBER;
      member: User;
    }
  | {
      type: typeof ACCEPT_USER;
      members: User[];
    }
  | {
      type: typeof DECLINE_USER;
      members: User[];
    }
  | {
      type: typeof GET_ALL_OFFICERS;
      officers: Officer[];
    }
  | {
      type: typeof GET_OFFICER_BY_ID;
      officer: Officer;
    }
  | {
      type: typeof GET_ALl_EXPUNGEMENT_REQUESTS;
      expungementRequests: ExpungementRequest[];
    }
  | {
      type: typeof ACCEPT_OR_DECLINE_REQUEST;
      expungementRequests: ExpungementRequest[];
    }
  | {
      type: typeof GET_10_CODES;
      codes: Code10[];
    }
  | {
      type: typeof CREATE_10_CODE;
    }
  | {
      type: typeof DELETE_10_CODE;
      codes: Code10[];
    }
  | {
      type: typeof DELETE_PENAL_CODE;
      penalCodes: PenalCode[];
    }
  | {
      type: typeof GET_PENAL_CODES;
      penalCodes: PenalCode[];
    }
  | {
      type: typeof SET_ADMIN_LOADING;
      loading: boolean;
    };

export default function adminReducer(state = initState, action: Actions) {
  switch (action.type) {
    case "GET_COMPANIES":
      return {
        ...state,
        companies: action.companies,
      };
    case "DELETE_COMPANY":
      return {
        ...state,
        companies: action.companies,
      };
    case "GET_CITIZENS":
      return {
        ...state,
        citizens: action.citizens,
      };
    case "DELETE_CITIZEN":
      return {
        ...state,
        citizens: action.citizens,
      };
    case "GET_MEMBERS":
      return {
        ...state,
        members: action.members,
      };
    case "GET_MEMBER_BY_ID":
      return {
        ...state,
        member: action.member,
      };
    case "UPDATE_MEMBER_PERMS":
      return {
        ...state,
        member: action.member,
      };
    case "BAN_MEMBER":
      return {
        ...state,
        member: action.member,
      };
    case "UN_BAN_MEMBER":
      return {
        ...state,
        member: action.member,
      };
    case "ACCEPT_USER":
      return {
        ...state,
        members: action.members,
      };
    case "DECLINE_USER":
      return {
        ...state,
        members: action.members,
      };
    case "GET_ALL_OFFICERS":
      return {
        ...state,
        officers: action.officers,
      };
    case "GET_OFFICER_BY_ID":
      return {
        ...state,
        officer: action.officer,
      };
    case "GET_ALl_EXPUNGEMENT_REQUESTS":
      return {
        ...state,
        expungementRequests: action.expungementRequests,
      };
    case "ACCEPT_OR_DECLINE_REQUEST":
      return {
        ...state,
        expungementRequests: action.expungementRequests,
      };
    case "GET_10_CODES":
      return {
        ...state,
        codes: action.codes,
      };
    case "DELETE_10_CODE":
      return {
        ...state,
        codes: action.codes,
      };
    case "GET_PENAL_CODES":
      return {
        ...state,
        penalCodes: action.penalCodes,
      };
    case "DELETE_PENAL_CODE":
      return {
        ...state,
        penalCodes: action.penalCodes,
      };
    case "SET_ADMIN_LOADING":
      return {
        ...state,
        loading: action.loading,
      };
    default:
      return {
        ...state,
      };
  }
}
