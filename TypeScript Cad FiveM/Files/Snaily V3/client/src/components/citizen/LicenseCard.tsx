import * as React from "react";
import { Link } from "react-router-dom";
import Citizen from "../../interfaces/Citizen";
import lang from "../../language.json";
import { Item, Span } from "../../pages/citizen/citizen-info";

interface Props {
  citizen: Citizen;
}

const LicenseCard: React.FC<Props> = ({ citizen }) => {
  return (
    <div className="card bg-dark border-dark mt-1">
      <div className="card-header d-flex justify-content-between">
        <h1 className="h4">{lang.citizen.licenses}</h1>

        <div>
          <Link className="btn btn-primary" to={`/licenses/edit/${citizen.id}`}>
            {lang.citizen.license.edit}
          </Link>
        </div>
      </div>

      <div className="card-body">
        <Item id="dmv">
          <Span>{lang.citizen.license.dmv}: </Span>
          {citizen.dmv}
        </Item>
        <Item id="fire_license">
          <Span>{lang.citizen.license.firearms}: </Span>
          {citizen.fire_license}
        </Item>
        <Item id="pilot_license">
          <Span>{lang.citizen.license.pilot}: </Span>
          {citizen.pilot_license}
        </Item>
        <Item id="ccw">
          <Span>{lang.citizen.license.ccw}: </Span>
          {citizen.ccw}
        </Item>
      </div>
    </div>
  );
};

export default LicenseCard;
