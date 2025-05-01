// Filter an array of content to remove items from blocked users
export const filterBlockedContent = (
  items,
  blockedUserIds,
  userIdField = "userId"
) => {
  if (!items || !Array.isArray(items)) return [];
  if (!blockedUserIds || !blockedUserIds.length) return items;

  return items.filter((item) => {
    // Get the user ID from the field specified
    const contentUserId =
      item[userIdField] ||
      (item.user && item.user.uid) ||
      item.uploadedBy ||
      item.addedBy;

    // If we can't determine the user, keep the content
    if (!contentUserId) return true;

    // Keep the item if the user is not blocked
    return !blockedUserIds.includes(contentUserId);
  });
};

//check if content is from a blocked user
export const isContentFromBlockedUser = (
  item,
  blockedUserIds,
  userIdField = "userId"
) => {
  if (!item || !blockedUserIds || !blockedUserIds.length) return false;

  // Get the user ID from the field specified
  const contentUserId =
    item[userIdField] ||
    (item.user && item.user.uid) ||
    item.uploadedBy ||
    item.addedBy;

  // If can't determine the user, assume not blocked
  if (!contentUserId) return false;

  // Check if the user is in the blocked list
  return blockedUserIds.includes(contentUserId);
};

//get blocked users form profile.
export const getBlockedUserIds = (userProfile) => {
  if (!userProfile || !userProfile.blockedUsers) return [];

  return userProfile.blockedUsers.map((user) => user.userId);
};

//filter spot videos
export const filterSpotVideos = (spot, blockedUserIds) => {
  if (!spot || !blockedUserIds || !blockedUserIds.length) return spot;

  // Create a copy of the spot
  const filteredSpot = { ...spot };

  // Filter videos if they exist
  if (filteredSpot.videos && Array.isArray(filteredSpot.videos)) {
    filteredSpot.videos = filteredSpot.videos.filter((video) => {
      const videoUserId = video.uploadedBy;
      return !videoUserId || !blockedUserIds.includes(videoUserId);
    });
  }

  return filteredSpot;
};

export default {
  filterBlockedContent,
  isContentFromBlockedUser,
  getBlockedUserIds,
  filterSpotVideos,
};
