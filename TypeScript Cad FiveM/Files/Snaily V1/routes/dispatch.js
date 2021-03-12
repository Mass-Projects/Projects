const router = require("express").Router();
const usernameNotFound = "There was an error getting your username.";

// Main Dispatch Page
router.get("/", (req, res) => {
    const query = "SELECT * FROM `users` WHERE username = ?";
    connection.query(query, [req.session.username2], (err, usernameResult) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500)
        } else {
            if (usernameResult[0]) {
                if (usernameResult[0].dispatch == 'yes') {
                    const addresses = "SELECT * FROM `citizens`"
                    const officersQ = "SELECT * FROM `officers` WHERE `status` = '10-41 | '"
                    const EMS = "SELECT * FROM `ems-fd` WHERE `status` = '10-41 | 10-8'";
                    const bolosQ = "SELECT * FROM `bolos`";
                    const callsQ = "SELECT * FROM `911calls`";
                    const cadInfo = "SELECT * FROM `cad_info`"
                    const currentStatus = "SELECT dispatch_status FROM `users` WHERE `username` = ?";
                    connection.query(`${addresses}; ${officersQ}; ${EMS}; ${bolosQ}; ${callsQ}; ${cadInfo}; ${currentStatus}`, [req.session.username2], (err, result) => {
                        if (err) {
                            console.log(err)
                            return res.sendStatus(500);
                        } else {                            
                            res.render("dispatch/main.ejs", { desc: "", title: "Dispatch | SnailyCAD", isAdmin: usernameResult[0].rank, address: result[0], officers: result[1], ems: result[2], cad: result[5][0], bolos: result[3], calls: result[4], currentStatus: result[6][0] });
                        };
                    });
                } else {
                    res.render("dispatch/403.ejs", { desc: "", title: "Unauthorized | SnailyCAD", isAdmin: usernameResult[0].rank });
                };
            } else {
                res.send(usernameNotFound);
            };
        };
    });
});


// Address Search
router.post("/address-search", (req, res) => {
    const query = "SELECT * FROM `users` WHERE `username` = ?"
    connection.query(query, [req.session.username2], (err, result1) => {
        if (result1[0]) {
            let searchQ = req.body.address;
            let query = "SELECT * FROM citizens WHERE address = ?";

            connection.query(query, [searchQ], (err, result) => {
                if (err) {
                    return console.log(err);
                } else {
                    res.render("dispatch/address-search.ejs", { desc: "", title: "Dispatch | SnailyCAD", isAdmin: result1[0].rank, users: result });
                };
            });
        } else {
            res.send(usernameNotFound);
        };
    });
});

// Update Officers Status
router.post("/update-status/:officerId", (req, res) => {
    const officerId = req.params.officerId
    let status = req.body.status;
    let status2 = req.body.status2;
    if (status2 === undefined) {
        status2 = "----------"
    }
    if (status === "10-42") {
        status = "10-42 | "
        status2 = " 10-7"
    }

    if (status === "10-41") {
        status = "10-41 | "
    }
    let query = "UPDATE `officers` SET `status` = ?, `status2` = ? WHERE `officers`.`id` = ?"

    connection.query(query, [status, status2, officerId], (err) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500)
        } else {
            res.redirect("/dispatch");
        };
    });
});


// Update AOP 
router.post("/update-aop", (req, res) => {
    let newAOP = req.body.aop

    if (newAOP === '') {
        newAOP = "N/A"
    }

    const query1 = "UPDATE `cad_info` SET `AOP` = ?"
    connection.query(`${query1};`, [newAOP], (err) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500)
        } else {
            res.redirect(`/dispatch`);
        };
    });
})


router.get("/status/:status", (req, res) => {
    const  status  = req.params.status ;

    const query = "UPDATE `users` SET `dispatch_status` = ? WHERE `users`.`username` = ?";
    connection.query(query, [status, req.session.username2], (err) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500)
        } else {
            res.redirect("/dispatch")
        }
    });
});

module.exports = router