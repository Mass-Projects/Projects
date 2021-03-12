import * as React from "react";
import { connect } from "react-redux";
import State from "../../../interfaces/State";
import lang from "../../../language.json";
import Field from "../../../interfaces/Field";
import AlertMessage from "../../alert-message";
import Modal, { XButton } from "../index";
import { creatArrestReport } from "../../../lib/actions/records";
import Officer from "../../../interfaces/Officer";
import Select from "../../select";
import PenalCode from "../../../interfaces/PenalCode";

interface Props {
  error: string | null;
  officer: Officer | null;
  penalCodes: PenalCode[];

  creatArrestReport: (data: {
    name: string;
    officer_name: string;
    charges: string;
    postal: string;
    notes: string;
  }) => void;
}

const CreateArrestReportModal: React.FC<Props> = ({
  error,
  officer,
  penalCodes,
  creatArrestReport,
}) => {
  const [name, setName] = React.useState("");
  const [charges, setCharges] = React.useState([]);
  const [postal, setPostal] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const btnRef = React.createRef<HTMLButtonElement>();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    creatArrestReport({
      name,
      officer_name: `${officer?.callsign} ${officer?.officer_name}`,
      charges: charges.map((v: any) => v.value).join(", "),
      postal,
      notes,
    });
  }

  React.useEffect(() => {
    if (error === null) {
      setNotes("");
      setName("");
      setCharges([]);
      setPostal("");
      setNotes("");

      btnRef.current?.click();
    }
  }, [error, btnRef]);

  const fields: Field[] = [
    {
      type: "text",
      id: "arrest_report_name",
      label: lang.record.enter_full_name,
      onChange: (e) => setName(e.target.value),
      value: name,
    },
    {
      type: "text",
      id: "arrest_report_postal",
      label: lang.record.postal,
      onChange: (e) => setPostal(e.target.value),
      value: postal,
    },
    {
      type: "text",
      id: "arrest_report_notes",
      label: lang.global.notes,
      onChange: (e) => setNotes(e.target.value),
      value: notes,
    },
  ];

  return (
    <Modal size="lg" id="createArrestReportModal">
      <div className="modal-header">
        <h5 className="modal-title">{lang.global.create_arrest_report}</h5>
        <XButton ref={btnRef} />
      </div>

      <form onSubmit={onSubmit}>
        <div className="modal-body">
          {error ? <AlertMessage message={{ msg: error, type: "warning" }} /> : null}
          {fields.map((field: Field, idx: number) => {
            return (
              <div id={`${idx}`} key={idx} className="mb-3">
                <label className="form-label" htmlFor={field.id}>
                  {field.label}
                </label>
                <input
                  className="form-control bg-secondary border-secondary text-light"
                  type={field.type}
                  id={field.id}
                  onChange={field.onChange}
                  value={field.value}
                  list={`${field.id}-list`}
                />
              </div>
            );
          })}
          <div className="mb-3">
            <label className="form-label">{lang.record.charges}</label>
            <Select
              closeMenuOnSelect={false}
              value={charges}
              onChange={(v: any) => setCharges(v)}
              options={penalCodes.map((code) => ({
                value: code.title,
                label: code.title,
              }))}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
            {lang.global.cancel}
          </button>
          <button type="submit" className="btn btn-primary">
            {lang.global.create_arrest_report}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const mapToProps = (state: State) => ({
  error: state.officers.error,
  officer: state.officers.activeOfficer,
  penalCodes: state.admin.penalCodes,
});

export default connect(mapToProps, { creatArrestReport })(CreateArrestReportModal);
