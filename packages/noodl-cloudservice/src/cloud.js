Parse.Cloud.beforeLogin(async req => {
  const {
    object: user
  } = req;

  if (!user) {
    return; // No user
  }

  const disabled = user.get('logInDisabled')
  if (!req.master && disabled) {
    throw Error('Access denied, log in disabled.')
  }
});
