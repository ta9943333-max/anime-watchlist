export const VIEWER_QUERY = `
query Viewer {
  Viewer {
    id
    name
    avatar { large medium }
    bannerImage
    options { scoreFormat }
    statistics {
      anime {
        count
        episodesWatched
        minutesWatched
        meanScore
      }
    }
  }
}
`;

export const MEDIA_LIST_COLLECTION_QUERY = `
query GetMediaListCollection($userName: String!, $type: MediaType!, $status: MediaListStatus) {
  MediaListCollection(userName: $userName, type: $type, status: $status) {
    lists {
      name
      isCustomList
      status
      entries {
        id
        mediaId
        status
        score
        progress
        repeat
        notes
        startedAt { year month day }
        completedAt { year month day }
        media {
          id
          idMal
          title { romaji english native }
          episodes
          duration
          genres
          status
          description(asHtml: false)
          averageScore
          format
          seasonYear
          season
          coverImage { large medium }
          nextAiringEpisode {
            episode
            timeUntilAiring
            airingAt
          }
        }
      }
    }
  }
}
`;

export const MEDIA_DETAIL_QUERY = `
query MediaDetail($id: Int, $userName: String) {
  Media(id: $id, type: ANIME) {
    id
    idMal
    title { romaji english native }
    episodes
    duration
    genres
    status
    format
    source
    description(asHtml: false)
    averageScore
    meanScore
    seasonYear
    season
    startDate { year month day }
    endDate { year month day }
    coverImage { large medium }
    bannerImage
    studios(isMain: true) { nodes { name } }
    nextAiringEpisode {
      episode
      timeUntilAiring
      airingAt
    }
    characters(perPage: 12, sort: ROLE) {
      edges {
        role
        node {
          id
          name { full }
          image { large }
        }
      }
    }
    relations {
      edges {
        relationType
        node {
          id
          type
          title { romaji english }
          coverImage { medium }
        }
      }
    }
    mediaListEntry(userName: $userName) {
      id
      mediaId
      status
      score
      progress
      repeat
      notes
      startedAt { year month day }
      completedAt { year month day }
    }
  }
}
`;

export const SEARCH_ANIME_QUERY = `
query SearchAnime($search: String, $page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(
      type: ANIME
      search: $search
      season: $season
      seasonYear: $seasonYear
      sort: POPULARITY_DESC
      isAdult: false
    ) {
      id
      idMal
      title { romaji english native }
      episodes
      averageScore
      status
      seasonYear
      season
      coverImage { large medium }
      nextAiringEpisode {
        episode
        timeUntilAiring
        airingAt
      }
    }
  }
}
`;

export const SAVE_MEDIA_LIST_ENTRY_MUTATION = `
mutation SaveMediaListEntry(
  $id: Int
  $mediaId: Int
  $status: MediaListStatus
  $score: Float
  $progress: Int
  $repeat: Int
  $notes: String
) {
  SaveMediaListEntry(
    id: $id
    mediaId: $mediaId
    status: $status
    score: $score
    progress: $progress
    repeat: $repeat
    notes: $notes
  ) {
    id
    mediaId
    status
    score
    progress
    repeat
    notes
  }
}
`;
