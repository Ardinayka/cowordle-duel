export async function isBlocked(db,a,b){
 if(!a||!b)return false;
 return !!await db.prepare('SELECT id FROM player_blocks WHERE id=? OR id=? LIMIT 1').bind(a+':'+b,b+':'+a).first();
}
export async function blockedTags(db,aTag,bTag){
 if(!aTag||!bTag)return false;
 return !!await db.prepare('SELECT b.id FROM player_blocks b JOIN friend_profiles a ON a.user_id=b.owner JOIN friend_profiles p ON p.user_id=b.blocked WHERE (a.tag=? AND p.tag=?) OR (a.tag=? AND p.tag=?) LIMIT 1').bind(aTag,bTag,bTag,aTag).first();
}
