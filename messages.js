// messages.js

const welcomeMessages = [
    `**🤝 ASSALAMU ALAIKUM <@{id}>! A warm welcome to the mighty **BLOOD HUNTERS Community**!  
📜 First things first, make sure to go through our server rules → <#{rules}> because respect and discipline are the foundation of our strength.  
ℹ️ Want to know who we truly are? Explore → <#{about}>.  
👑 We are the official gang of Dream Life RP Bangladesh, standing tall with pride and loyalty.  
🔥 Remember, once you wear the HUNTERS badge, loyalty is your greatest weapon. Welcome to the family!**`,

    `**👑 Welcome aboard <@{id}>! We are overjoyed to see you join the **BLOOD HUNTERS Family**.  
📜 Every warrior must respect the rules → <#{rules}>. They keep our house strong and united.  
ℹ️ Curious about our legacy? Learn more here → <#{about}>.  
⚔️ Together we rise, together we fight, together we stand as brothers.  
🔥 By joining, you’ve become part of a powerful legacy that values respect, loyalty, and never-ending brotherhood!**`,

    `**✨ Assalamu Alaikum <@{id}>! Welcome to the battlefield of loyalty, the **BLOOD HUNTERS Gang**!  
📜 Our first law is discipline → <#{rules}>.  
ℹ️ Second law is to know who we are → <#{about}>.  
🚀 We are a family of fighters, united by trust, respect, and ambition.  
🔥 Enjoy your stay, and remember: we don’t walk alone, we walk as HUNTERSs.**`,

    `**🔥 Welcome <@{id}>! The gates of the **BLOOD HUNTERS Community** open wide for you today.  
📜 Please honor the family by reading → <#{rules}>.  
ℹ️ Want to know our journey? See → <#{about}>.  
👑 Our gang is not just about power, it’s about respect and support for one another.  
🔥 We fight together, we celebrate together, and now, you are one of us.**`,

    `**💎 Greetings <@{id}>! Your entry to the **BLOOD HUNTERS Family** is celebrated with pride.  
📜 Start strong by checking → <#{rules}>.  
ℹ️ Then, explore the story that defines us → <#{about}>.  
⚔️ We are an unbreakable chain, each member a vital link.  
🔥 You’re not just a guest — you are family now, and family is forever.**`,

    `**🚀 Yo <@{id}>! Welcome to **BLOOD HUNTERS**, where loyalty is louder than words!  
📜 Read and follow the laws of the house → <#{rules}>.  
ℹ️ Learn about our pride and achievements → <#{about}>.  
👑 This isn’t just a server, it’s a family built on trust.  
🔥 You’ve joined warriors who never turn back. Stand tall, HUNTERS!**`,

    `**❤️ Assalamu Alaikum <@{id}>! The **BLOOD HUNTERS Gang** greets you with open arms.  
📜 Every family has rules → <#{rules}>, and we are no different.  
ℹ️ Want to know our heartbeat? Click here → <#{about}>.  
⚡ Loyalty, respect, and unity — that is our strength.  
🔥 Welcome home, soldier. Let’s conquer together.**`,

    `**⚡️ Hey <@{id}>! Welcome to the official grounds of **BLOOD HUNTERS**!  
📜 Rulebook is sacred → <#{rules}>.  
ℹ️ Curious minds must visit → <#{about}>.  
👑 We are not just a gang, we are a symbol of honor in Dream Life RP.  
🔥 You are here because you belong here, and here you will rise.**`,

    `**🎉 Salam <@{id}>! Welcome to the **BLOOD HUNTERS Community**, a place where warriors are born.  
📜 Discipline starts with rules → <#{rules}>.  
ℹ️ Understanding starts with knowledge → <#{about}>.  
👑 Our family thrives on respect, laughter, and power.  
🔥 Let’s make memories together, HUNTERS style!**`,

    `**🤩 Welcome <@{id}>! It’s a big day because you just joined the **BLOOD HUNTERS Family**!  
📜 Check → <#{rules}> to stay in harmony with the gang.  
ℹ️ Discover more → <#{about}> about us.  
⚔️ This gang is not ordinary, it’s legendary.  
🔥 Buckle up — from now on, you are part of something bigger than yourself.**`,


    `**🌟 Assalamu Alaikum <@{id}>! A Blood welcome to the **BLOOD HUNTERS Community**.  
📜 Every respected warrior begins by honoring the rules → <#{rules}>. Without discipline, there’s no unity.  
ℹ️ To discover our history, check out → <#{about}>.  
👑 Remember, HUNTERSs are not just a gang; we are a movement of loyalty, brotherhood, and respect.  
🔥 You are now a flame in this eternal fire!**`,

    `**🔥 Welcome soldier <@{id}>! You just stepped into the gates of **BLOOD HUNTERS**.  
📜 Our rules are sacred → <#{rules}>. Break them and you break the bond.  
ℹ️ Our story is legendary → <#{about}>. Read it and feel the pride.  
⚔️ We walk together, we fight together, and now, you are officially one of us.  
🔥 Stand tall and make your presence felt, HUNTERS warrior!**`,

    `**💎 Salaam <@{id}>! Your arrival makes the **BLOOD HUNTERS Family** shine brighter.  
📜 Please respect and follow → <#{rules}>.  
ℹ️ To know more about who we are and what we stand for, visit → <#{about}>.  
👑 This community is not just about gaming, it’s about values, unity, and endless brotherhood.  
🔥 We are proud to have you here.**`,

    `**🚀 Hey <@{id}>! Welcome aboard the **BLOOD HUNTERS Ship** of loyalty and respect.  
📜 Captain’s orders: read → <#{rules}>.  
ℹ️ Discover the journey → <#{about}>.  
👑 Once you’re inside, you’re part of an unbreakable chain.  
🔥 Welcome to a place where your presence will always matter.**`,

    `**❤️ Assalamu Alaikum <@{id}>!  
👑 You’ve just joined the **BLOOD HUNTERS Gang**, where every member is a brother.  
📜 Brotherhood starts with respect → <#{rules}>.  
ℹ️ Knowledge starts with curiosity → <#{about}>.  
🔥 You are now part of our family, and together we will conquer dreams, battles, and history.**`,

    `**⚡ Welcome <@{id}>! This is the **BLOOD HUNTERS Family** — stronger than iron, warmer than home.  
📜 Every warrior obeys → <#{rules}>.  
ℹ️ Every warrior knows → <#{about}>.  
👑 Stand proud, because once inside, you’re not alone anymore.  
🔥 You’re a HUNTERS now, forever and always.**`,

    `**🎉 Greetings <@{id}>! A new flame has joined the **BLOOD HUNTERS Fire**.  
📜 Respect begins with → <#{rules}>.  
ℹ️ Knowledge begins with → <#{about}>.  
👑 Our strength is not in numbers, but in loyalty.  
🔥 Carry the HUNTERS spirit proudly in every step you take!**`,

    `**✨ Welcome <@{id}> to the **BLOOD HUNTERS Kingdom**!  
📜 Your first duty is to know → <#{rules}>.  
ℹ️ Your second duty is to learn → <#{about}>.  
⚔️ Together we build, together we rise, and together we fight with pride.  
🔥 You are not just a member — you are family now.**`,

    `**👑 Assalamu Alaikum <@{id}>! Welcome to the throne room of the **BLOOD HUNTERS**.  
📜 Rulebook is here → <#{rules}>.  
ℹ️ Legacy is here → <#{about}>.  
⚡ Remember: HUNTERSs never betray, never quit, never lose hope.  
🔥 Now that you’re here, the legacy grows stronger.**`,

    `**🤩 Salam <@{id}>! Welcome to the **BLOOD HUNTERS Family**, where loyalty runs deep.  
📜 Our book of laws → <#{rules}>.  
ℹ️ Our heart and story → <#{about}>.  
👑 Brotherhood is our religion, loyalty is our tradition.  
🔥 Walk with pride, because you are HUNTERS now!**`,

    `**🔥 Yo <@{id}>! The **BLOOD HUNTERS Gang** welcomes you with respect and joy.  
📜 Before anything, check → <#{rules}>.  
ℹ️ Then, discover our story → <#{about}>.  
⚔️ With you, our circle of strength becomes stronger.  
🔥 Once a HUNTERS, forever a HUNTERS. Welcome home!**`,

    `**🌍 Welcome <@{id}> to **BLOOD HUNTERS**, the home of unity and loyalty.  
📜 All warriors follow → <#{rules}>.  
ℹ️ All warriors know → <#{about}>.  
👑 This is more than a community, this is family.  
🔥 Together, we will write new chapters of glory!**`,

    `**🎊 Big welcome <@{id}>! You’ve joined the **BLOOD HUNTERS Family**, the strongest gang in Dream Life RP.  
📜 Rules → <#{rules}> are your compass.  
ℹ️ Our story → <#{about}> is your guide.  
⚡ With you, we grow stronger, louder, and prouder.  
🔥 Make yourself at home — you belong here now.**`,

    `**💫 Welcome <@{id}>! You are now part of the **BLOOD HUNTERS Universe**.  
📜 Our rules keep the stars aligned → <#{rules}>.  
ℹ️ Our story keeps the galaxy alive → <#{about}>.  
👑 Every HUNTERS is a star, and now you are shining with us.  
🔥 Together, we will light up the sky of loyalty.**`,

    `**🏆 Assalamu Alaikum <@{id}>! Your presence in the **BLOOD HUNTERS Family** is an honor.  
📜 The foundation is → <#{rules}>.  
ℹ️ The history is → <#{about}>.  
👑 You’re not just a recruit; you’re a guardian of our values.  
🔥 Stand tall, HUNTERS — the legacy is in your hands!**`

];

const leaveMessages = [
    `**😔 A sad day… <@{id}> has left the **BLOOD HUNTERS Family**.  
💔 You were part of our bond, and every bond leaves a mark.  
🙏 We hope your journey ahead is filled with success and peace.  
🔥 Remember, you may leave the server, but the HUNTERS spirit will always carry your name.**`,

    `**👋 Farewell <@{id}>!  
💎 Once a HUNTERS, always a HUNTERS.  
⚡ Thank you for the time you spent with us in this family.  
🙏 Take care of yourself out there, and remember that our doors are always open for your return.**`,

    `**💔 Goodbye <@{id}>.  
😢 Members may leave, but memories never fade.  
🙏 May your future be brighter than the stars above.  
🔥 BLOOD HUNTERS will always keep a chair empty for your return.**`,

    `**😥 <@{id}> has departed from **BLOOD HUNTERS**.  
💔 You were part of our story, and stories never end.  
🙏 Good luck for everything that comes your way.  
🔥 Brotherhood never truly breaks — we hope to meet again.**`,

    `**🚪 <@{id}> left the server today…  
😢 Family bonds don’t vanish, they live in our hearts.  
🙏 Stay safe, stay strong, and keep pushing forward.  
🔥 HUNTERS pride goes with you, wherever you go.**`,

    `**👑 Another warrior gone — <@{id}> has left.  
💔 Your presence will be missed by many.  
🙏 Wishing you happiness, success, and safety.  
🔥 This gang is forever, and you will always be remembered.**`,

    `**⚡ Farewell <@{id}>!  
😔 Sometimes paths separate, but respect remains.  
🙏 Go out there and shine in your own way.  
🔥 The HUNTERS legacy will never forget your contribution.**`,

    `**🎭 Goodbye <@{id}>.  
💔 A strong soldier leaves, but never truly disappears.  
🙏 May your journey be blessed with peace.  
🔥 BLOOD HUNTERS will always hold your name with honor.**`,

    `**😔 <@{id}> is no longer part of our server…  
💎 Thank you for being a brother/sister in arms.  
🙏 May fate lead you to greatness.  
🔥 Our doors never close — come back anytime, soldier.**`,

    `**🕊️ Farewell <@{id}>.  
😢 It hurts to see you go.  
🙏 We wish you health, happiness, and fortune ahead.  
🔥 Always HUNTERS, always remembered.**`,

    `**😔 Farewell <@{id}>! Another warrior left the **BLOOD HUNTERS Family**…  
💔 Though you are gone, your footsteps, your laughter, and your memories remain with us forever.  
👑 HUNTERSs never truly part ways — once a brother, always a brother.  
🔥 Wherever life takes you, know that our gates remain open. Take care, soldier!**`,

    `**👋 Goodbye <@{id}>! You may have left the **BLOOD HUNTERS Gang**, but your loyalty and time here will always be remembered.  
💎 You were part of our journey, and that can never be erased.  
🙏 May success follow you everywhere.  
🔥 If destiny allows, we’ll meet again on the battlefield of dreams.**`,

    `**😢 Sad news: <@{id}> has departed from the **BLOOD HUNTERS** family.  
💔 Your absence leaves a void that can’t be filled.  
👑 HUNTERSs never forget their own, no matter where they go.  
🔥 Till we meet again, may the roads ahead bring you joy and victory!**`,

    `**🌪️ A storm of emotions as <@{id}> leaves the **BLOOD HUNTERS**.  
💔 Brotherhood may feel broken, but in our hearts, you remain eternal.  
👑 Every battle we fought together will echo in our legacy.  
🔥 Farewell, comrade — our doors will forever remain open for you.**`,

    `**⚡ Farewell <@{id}>! You may be gone from the server, but never from the hearts of the **BLOOD HUNTERS Family**.  
💎 Once a HUNTERS, forever a HUNTERS.  
👑 Your name will live among our history.  
🔥 May life grant you peace, strength, and success in every step.**`,

    `**🌹 Goodbye <@{id}>!  
💔 The **BLOOD HUNTERS** loses a gem today.  
👑 But remember, true loyalty never dies, it only travels different paths.  
🔥 Your time here added value to our journey, and for that, we are grateful. Stay strong, soldier!**`,

    `**😞 Farewell brother <@{id}>! Leaving the **BLOOD HUNTERS** doesn’t erase the bond we shared.  
💎 You were one of us, and you’ll always remain in our story.  
👑 May your road ahead be filled with light and blessings.  
🔥 Until the day paths cross again — goodbye with honor.**`,

    `**💔 Heartbreak as <@{id}> steps away from the **BLOOD HUNTERS Family**.  
⚔️ You fought with us, laughed with us, and now we honor your departure.  
👑 Legends never die, and your part in our family is legendary.  
🔥 Goodbye, soldier — the HUNTERS flame will always burn for you.**`,

    `**👋 Goodbye comrade <@{id}>!  
📜 Every chapter has an ending, and today yours closes with the **BLOOD HUNTERS**.  
💎 But remember, every ending gives rise to a new beginning.  
🔥 May your next journey be brighter and stronger. We salute you!**`,

    `**😔 Sad farewell <@{id}>!  
👑 The **BLOOD HUNTERS Gang** bows with respect as you leave our halls.  
💔 Distance may separate us, but memories keep us close.  
🔥 Carry our values with pride — once HUNTERS, always HUNTERS.**`,

    `**🌌 Farewell <@{id}>! Your presence lit the stars of the **BLOOD HUNTERS**.  
💎 Even though you’re leaving, the light you gave us will never fade.  
👑 Our galaxy loses a star today, but the universe still remembers you.  
🔥 Keep shining wherever you go, HUNTERS warrior.**`,

    `**👑 Goodbye <@{id}>! A loyal heart leaves the **BLOOD HUNTERS Family** today.  
💔 Your absence will be felt in every corner.  
⚡ But loyalty doesn’t end with departure — it lives forever.  
🔥 Farewell soldier, till we unite again in spirit and fight.**`,

    `**💔 Farewell <@{id}>! Your chapter in **BLOOD HUNTERS** may end, but your story remains in our book forever.  
⚔️ You were more than just a member; you were family.  
👑 Take with you the strength of our unity.  
🔥 Wherever destiny takes you, HUNTERS spirit stays with you.**`,

    `**😢 Another goodbye… <@{id}> leaves the **BLOOD HUNTERS** today.  
💎 Your memories will echo in our brotherhood.  
👑 Once a HUNTERS soldier, always a HUNTERS soldier.  
🔥 We pray for your future, may it be filled with loyalty, respect, and endless victories.**`,

    `**👋 Goodbye <@{id}>!  
💔 With heavy hearts, the **BLOOD HUNTERS Family** watches you leave.  
⚡ Remember, bonds are not broken by distance, only strengthened by memories.  
🔥 Farewell, comrade — the flame of HUNTERS will always wait for you.**`

];

module.exports = { welcomeMessages, leaveMessages };
