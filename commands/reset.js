/**
 * Created by kretolus on 08.06.18.
 */
module.exports = {
    name: 'reset',
    owner_only: true,
    description: 'Resets the bot.',
    execute(logger, client, message) {
        message.guild.fetchMember(client.user).then((member) => {
            member.setNickname('RadBot')
                .then((member) => {
                    client.user.setAvatar('./icons/bot-img.png')
                        .then((user) => {})
                        .catch((error) => {
                            logger.log({
                                level: "error",
                                message: error
                            });
                        });
                }).catch((error) => {
                    logger.log({
                        level: "error",
                        message: error
                    });
                });
        });
    },
};
