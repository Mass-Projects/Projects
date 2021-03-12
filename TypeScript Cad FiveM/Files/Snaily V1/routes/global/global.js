const router = require("express").Router();

// Add a bolo from /officers & /dispatch
router.post("/:dir/add-bolo", (req, res) => {
    const boloDesc = req.body.bolo_desc;
    const query = "INSERT INTO `bolos` (`description`) VALUES (?)";
    connection.query(query, [boloDesc], (err) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        } else {
            if (req.path.includes("officers")) {
                res.redirect("/officers/dash");
            } else {
                res.redirect("/dispatch");
            };
        };
    });
});

// Delete Bolo from /officers & /dispatch
router.get("/:dir/delete-bolo-:boloId", (req, res) => {
    const boloId = req.params.boloId;
    const query = "DELETE FROM `bolos` WHERE `id` = ?";
    connection.query(query, [boloId], (err) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        } else {
            if (req.path.includes("officers")) {
                res.redirect("/officers/dash");
            } else {
                res.redirect("/dispatch");
            };
        };
    });
});

// Suspend DMV from /officers & /dispatch
router.get("/:dir/susdmv/:citizenId", (req, res) => {
    const citizenId = req.params.citizenId;
    const query = "UPDATE `citizens` SET `dmv` = ? WHERE `citizens`.`id` = ?";

    connection.query(query, ["Suspended", citizenId], (err, result) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500)
        } else {
            if (req.path.includes("officers")) {
                res.redirect("/officers/dash")
            } else {
                res.redirect("/dispatch")
            }
        }

    })
});

// Warrant from /officers & /dispatch
router.post("/:dir/add-warrant", (req, res) => {
    const query = "SELECT * FROM `users` WHERE username = ?"
    connection.query(query, [req.session.username2], (err, result) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500)
        } else {
            if (result[0]) {
                const name = req.body.name;
                const status = req.body.status
                const reason = req.body.reason
                const query = "INSERT INTO `warrants` ( `name`, `reason`, `status`) VALUES (?, ?, ?)";

                connection.query(query, [name, reason, status], (err) => {
                    if (err) {
                        console.log(err);
                        return res.sendStatus(500);
                    } else {
                        if (req.path.includes("officers")) {
                            res.redirect("/officers/dash");
                        } else {
                            res.redirect("/dispatch");
                        };
                    };
                });
            } else {
                res.send("Something went wrong during the request");
            };
        };
    });
});


// 911 CALLS

// Cancel 911 call
router.get("/:dir/cancel-911-call-:callId", (req, res) => {
    const query = "SELECT * FROM `users` WHERE username = ?"
    connection.query(query, [req.session.username2], (err, result) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500)
        } else {
            if (result[0]) {
                const query = "DELETE FROM `911calls` WHERE `id` = ?"
                connection.query(query, [req.params.callId], (err) => {
                    if (err) {
                        console.log(err);
                        return res.sendStatus(500);
                    } else {
                        if (req.path.includes("officers")) {
                            res.redirect(`/officers/dash`);
                        } else if (req.path.includes("ems-fd")) {
                            res.redirect(`/ems-fd/dash`);
                        } else {
                            res.redirect(`/dispatch`);
                        }
                    };
                });
            } else {
                res.send("Something went wrong during the request");
            };
        };
    });
});

// Update 911 Call
router.post("/:dir/update-911-call-:callId", (req, res) => {
    const query = "SELECT * FROM `users` WHERE username = ?"
    connection.query(query, [req.session.username2], (err, result) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500)
        } else {
            if (result[0]) {
                const location = req.body.location;
                const assigned_unit = [req.body.assigned_unit].join(" ");
                let status = req.body.status;
                const callDescription = req.body.description

                if (assigned_unit !== "") {
                    status = "Assigned"
                }
                if (assigned_unit === "") {
                    status = "Not Assigned"
                }

                const callId = req.params.callId;
                let query = "UPDATE `911calls` SET `location` = ?, `status` = ?, `assigned_unit` = ?, `description` = ? WHERE `911calls`.`id` = ?"
                connection.query(query, [location, status, assigned_unit, callDescription, callId], (err) => {
                    if (err) {
                        console.log(err);
                        return res.sendStatus(500);
                    } else {
                        if (req.path.includes("officers")) {
                            res.redirect(`/officers/dash`);
                        } else if (req.path.includes("ems-fd")) {
                            res.redirect(`/ems-fd/dash`);
                        } else {
                            res.redirect(`/dispatch`);
                        }
                    };
                });
            } else {
                res.send("Something went wrong during the request");
            };
        };
    });
});


// Update warrant status
router.get("/:dir/w-status-:id", (req, res) => {
    const query = "SELECT * FROM `warrants` WHERE `id` = ?";

    connection.query(query, [req.params.id], (err, result) => {
        if (result[0].status === "Active") {
            status = "Inactive";
        } else {
            status = "Active";
        };

        connection.query("UPDATE `warrants` SET `status` = ? WHERE `id` = ?", [status, req.params.id], (err) => {
            if (err) {
                console.log(err);
                return res.sendStatus(500);
            } else {
                if (req.path.includes("officers")) {
                    res.redirect(`/officers/dash`);
                } else {
                    res.redirect(`/dispatch`);
                }
            };
        });
    });
});



module.exports = router;