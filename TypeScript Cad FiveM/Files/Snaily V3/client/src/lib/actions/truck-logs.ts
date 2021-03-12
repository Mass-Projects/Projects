import TruckLog from "../../interfaces/TruckLog";
import Logger from "../Logger";
import { Dispatch } from "react";
import { CREATE_TRUCK_LOG, DELETE_TRUCK_LOG, GET_TRUCK_LOGS, SET_MESSAGE } from "../types";
import { handleRequest, isSuccess } from "../functions";
import Message from "../../interfaces/Message";
import lang from "../../language.json";

interface IDispatch {
  type: string;
  logs?: TruckLog[];
  message?: Message;
  error?: string;
}

export const getTruckLogs = () => async (dispatch: Dispatch<IDispatch>) => {
  try {
    const res = await handleRequest("/truck-logs", "GET");
    if (isSuccess(res)) {
      dispatch({
        type: GET_TRUCK_LOGS,
        logs: res.data.logs,
      });
    }
  } catch (e) {
    Logger.error(GET_TRUCK_LOGS, e);
  }
};

export const createTruckLog = (data: object) => async (dispatch: Dispatch<IDispatch>) => {
  try {
    const res = await handleRequest("/truck-logs", "POST", data);

    if (isSuccess(res)) {
      dispatch({
        type: CREATE_TRUCK_LOG,
      });
      return (window.location.href = "/truck-logs");
    } else {
      dispatch({
        type: SET_MESSAGE,
        message: { msg: res.data.error, type: "warning" },
      });
    }
  } catch (e) {
    Logger.error(CREATE_TRUCK_LOG, e);
  }
};

export const deleteTruckLog = (id: string) => async (dispatch: Dispatch<IDispatch>) => {
  try {
    const res = await handleRequest(`/truck-logs/${id}`, "DELETE");

    if (isSuccess(res)) {
      dispatch({
        type: DELETE_TRUCK_LOG,
        logs: res.data.logs,
      });
      dispatch({
        type: SET_MESSAGE,
        message: { msg: lang.truck_logs.deleted_truck_log, type: "success" },
      });
    }
  } catch (e) {
    Logger.error(DELETE_TRUCK_LOG, e);
  }
};
