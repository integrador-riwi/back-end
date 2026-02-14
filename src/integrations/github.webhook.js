router.post("/webhooks/github", async (req, res) => {
  const { action, membership } = req.body;

  if (action === "member_added") {
    const githubUsername = membership.user.login;

    await UserService.updateTeamStatus(githubUsername, "active");
  }

  res.status(200).send("ok");
});
