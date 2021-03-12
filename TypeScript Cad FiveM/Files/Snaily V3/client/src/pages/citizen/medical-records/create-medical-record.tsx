import * as React from "react";
import AlertMessage from "../../../components/alert-message";
import Layout from "../../../components/Layout";
import Match from "../../../interfaces/Match";
import State from "../../../interfaces/State";
import lang from "../../../language.json";
import { connect } from "react-redux";
import { createMedicalRecord } from "../../../lib/actions/citizen";
import { Link } from "react-router-dom";
import useDocTitle from "../../../hooks/useDocTitle";

interface Props {
  error: string | null;
  match: Match;
  createMedicalRecord: (data: object, id: string, shouldReturn: boolean) => void;
}

const CreateMedicalRecordPage: React.FC<Props> = ({ match, error, createMedicalRecord }) => {
  const [type, setType] = React.useState("Allergy");
  const [shortInfo, setShortInfo] = React.useState("");
  const citizenId = match.params.id;
  useDocTitle("Create medical record");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    createMedicalRecord(
      {
        type,
        shortInfo,
      },
      citizenId,
      true,
    );
  }

  return (
    <Layout classes="mt-5">
      {error ? <AlertMessage message={{ msg: error, type: "warning" }} dismissible /> : null}
      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label className="form-label" htmlFor="type">
            {lang.citizen.medical.type}
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="form-control bg-dark border-dark text-light"
          >
            <option value="Allergy">Allergy</option>
            <option value="Medication">Medication</option>
            <option value="Health Problem">Health Problem</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="short_info">
            {lang.citizen.medical.short_info}
          </label>
          <textarea
            id="short_info"
            cols={10}
            rows={2}
            value={shortInfo}
            onChange={(e) => setShortInfo(e.target.value)}
            className="form-control bg-dark border-dark text-light"
            style={{ resize: "vertical" }}
          ></textarea>
        </div>

        <div className="mb-3 float-end">
          <Link to={`/citizen/${citizenId}`} className="btn btn-danger">
            {lang.global.cancel}
          </Link>
          <button type="submit" className="btn btn-primary ms-2">
            {lang.citizen.medical.add}
          </button>
        </div>
      </form>
    </Layout>
  );
};

const mapToProps = (state: State) => ({
  error: state.citizen.error,
});

export default connect(mapToProps, { createMedicalRecord })(CreateMedicalRecordPage);
