'use client'
import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';

export default function Home() {
  const [movies, setMovies] = useState({
    trending: [],
    topRated: [],
    upcoming: [],
    nowPlaying: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('trending');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();
  const loadingRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    mediaType: 'all', // 'all', 'movie', 'tv'
    genre: 'all',
    year: 'all',
    sortBy: 'popularity.desc'
  });
  const [appliedFilters, setAppliedFilters] = useState({
    mediaType: 'all',
    genre: 'all',
    year: 'all',
    sortBy: 'popularity.desc'
  });

  // Update the genres object to include both movie and TV genres
  const genres = {
    movie: [
      { id: 28, name: 'Action' },
      { id: 12, name: 'Adventure' },
      { id: 16, name: 'Animation' },
      { id: 35, name: 'Comedy' },
      { id: 80, name: 'Crime' },
      { id: 18, name: 'Drama' },
      { id: 14, name: 'Fantasy' },
      { id: 27, name: 'Horror' },
      { id: 10749, name: 'Romance' },
      { id: 878, name: 'Science Fiction' },
      { id: 53, name: 'Thriller' },
      { id: 10752, name: 'War' }
    ],
    tv: [
      { id: 10759, name: 'Action & Adventure' },
      { id: 16, name: 'Animation' },
      { id: 35, name: 'Comedy' },
      { id: 80, name: 'Crime' },
      { id: 18, name: 'Drama' },
      { id: 10751, name: 'Family' },
      { id: 10765, name: 'Sci-Fi & Fantasy' },
      { id: 10768, name: 'War & Politics' }
    ]
  };

  const years = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i);

  const resetToHome = () => {
    setSearchQuery('');
    setIsSearching(false);
    setActiveTab('trending');
    setShowFilters(false);
    setFilters({
      mediaType: 'all',
      genre: 'all',
      year: 'all',
      sortBy: 'popularity.desc'
    });
    setAppliedFilters({
      mediaType: 'all',
      genre: 'all',
      year: 'all',
      sortBy: 'popularity.desc'
    });
  };

  // Update the fetchMovies function with corrected filtering
  const fetchMovies = async (pageNum, isNewTab = false) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const categories = {
        trending: appliedFilters.mediaType === 'tv' ? 'trending/tv/week' : 'trending/movie/week',
        topRated: appliedFilters.mediaType === 'tv' ? 'tv/top_rated' : 'movie/top_rated',
        upcoming: 'movie/upcoming',
        nowPlaying: appliedFilters.mediaType === 'tv' ? 'tv/on_the_air' : 'movie/now_playing'
      };

      const endpoint = categories[activeTab];
      let url = `https://api.themoviedb.org/3/${endpoint}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&page=${pageNum}`;
      
      // Add genre filter to the API call
      if (appliedFilters.genre !== 'all') {
        url += `&with_genres=${appliedFilters.genre}`;
      }

      // Special handling for upcoming movies
      if (activeTab === 'upcoming') {
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
        url += `&primary_release_date.gte=${today}&primary_release_date.lte=${sixMonthsFromNow.toISOString().split('T')[0]}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${activeTab} content`);
      const data = await response.json();
      
      let results = data.results;

      // Format TV show data to match movie format
      if (appliedFilters.mediaType === 'tv') {
        results = results.map(show => ({
          ...show,
          title: show.name,
          release_date: show.first_air_date,
          media_type: 'tv'
        }));
      } else {
        results = results.map(movie => ({
          ...movie,
          media_type: 'movie'
        }));
      }

      // Client-side filtering
      if (appliedFilters.year !== 'all') {
        results = results.filter(item => {
          const date = new Date(item.release_date || item.first_air_date);
          return date.getFullYear().toString() === appliedFilters.year;
        });
      }
// Add additional client-side genre filtering if needed
      if (appliedFilters.genre !== 'all') {
        results = results.filter(item => {
          if (!item.genre_ids) return false;
          return item.genre_ids.includes(Number(appliedFilters.genre));
        });
      }

      // Apply sorting
      results.sort((a, b) => {
        switch (appliedFilters.sortBy) {
          case 'popularity.desc':
            return b.popularity - a.popularity;
          case 'popularity.asc':
            return a.popularity - b.popularity;
          case 'vote_average.desc':
            return b.vote_average - a.vote_average;
          case 'vote_average.asc':
            return a.vote_average - b.vote_average;
          case 'release_date.desc':
            const dateB = new Date(b.release_date || b.first_air_date);
            const dateA = new Date(a.release_date || a.first_air_date);
            return dateB - dateA;
          case 'release_date.asc':
            const dateA2 = new Date(a.release_date || a.first_air_date);
            const dateB2 = new Date(b.release_date || b.first_air_date);
            return dateA2 - dateB2;
          default:
            return b.popularity - a.popularity;
        }
      });

      // Filter upcoming content if needed
      if (activeTab === 'upcoming') {
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
        results = results.filter(item => {
          const releaseDate = new Date(item.release_date);
          return releaseDate > new Date() && releaseDate <= sixMonthsFromNow;
        });
      }

      setMovies(prev => ({
        ...prev,
        [activeTab]: isNewTab ? results : [...prev[activeTab], ...results]
      }));
      
      setHasMore(data.page < data.total_pages && results.length > 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const searchMovies = async (query) => {
    if (!query.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      // Reset to default view
      setActiveTab('trending');
      setPage(1);
      fetchMovies(1, true);
      return;
    }

    setLoading(true);
    setIsSearching(true);
    
    try {
      // Get the current filters at the time of search
      const currentFilters = { ...appliedFilters };
      const endpoints = [];

      if (currentFilters.mediaType === 'all' || currentFilters.mediaType === 'movie') {
        endpoints.push(
          fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false${
              currentFilters.year !== 'all' 
                ? `&primary_release_date.gte=${currentFilters.year}-01-01&primary_release_date.lte=${currentFilters.year}-12-31` 
                : ''
            }${currentFilters.genre !== 'all' ? `&with_genres=${currentFilters.genre}` : ''}`
          )
        );
      }

      if (currentFilters.mediaType === 'all' || currentFilters.mediaType === 'tv') {
        endpoints.push(
          fetch(
            `https://api.themoviedb.org/3/search/tv?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false${
              currentFilters.year !== 'all' 
                ? `&first_air_date.gte=${currentFilters.year}-01-01&first_air_date.lte=${currentFilters.year}-12-31` 
                : ''
            }${currentFilters.genre !== 'all' ? `&with_genres=${currentFilters.genre}` : ''}`
          )
        );
      }

      const responses = await Promise.all(endpoints);
      const isValid = responses.every(response => response.ok);

      if (!isValid) {
        throw new Error('Failed to search content');
      }

      const data = await Promise.all(responses.map(response => response.json()));
      
      let combinedResults = [];
      
      if (appliedFilters.mediaType === 'all' || appliedFilters.mediaType === 'movie') {
        combinedResults = [...combinedResults, ...data[0].results.map(movie => ({ ...movie, media_type: 'movie' }))];
      }
      if (appliedFilters.mediaType === 'all' || appliedFilters.mediaType === 'tv') {
        const tvData = data[appliedFilters.mediaType === 'all' ? 1 : 0];
        combinedResults = [...combinedResults, ...tvData.results.map(show => ({
          ...show,
          title: show.name,
          release_date: show.first_air_date,
          media_type: 'tv'
        }))];
      }

      // Apply sorting
      const sortedResults = combinedResults.sort((a, b) => {
        switch (appliedFilters.sortBy) {
          case 'popularity.desc':
            return b.popularity - a.popularity;
          case 'popularity.asc':
            return a.popularity - b.popularity;
          case 'vote_average.desc':
            return b.vote_average - a.vote_average;
          case 'vote_average.asc':
            return a.vote_average - b.vote_average;
          case 'release_date.desc':
            return new Date(b.release_date) - new Date(a.release_date);
          case 'release_date.asc':
            return new Date(a.release_date) - new Date(b.release_date);
          default:
            return b.popularity - a.popularity;
        }
      });

      // Update this part to use currentFilters instead of appliedFilters
      let filteredResults = sortedResults;
      if (currentFilters.mediaType !== 'all') {
        filteredResults = sortedResults.filter(item => item.media_type === currentFilters.mediaType);
      }

      setSearchResults(filteredResults);
      setError(null);
    } catch (err) {
      console.error('Error searching content:', err);
      setError('Failed to search content');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const lastMovieRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  useEffect(() => {
    setPage(1);
    setMovies(prev => ({ ...prev, [activeTab]: [] }));
    fetchMovies(1, true);
  }, [activeTab]);

  useEffect(() => {
    if (page > 1) {
      fetchMovies(page, false);
    }
  }, [page]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchMovies(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, appliedFilters]); // Add appliedFilters as a dependency

  // Add a useEffect to refetch movies when filters change
  useEffect(() => {
    if (!isSearching) {
      setPage(1);
      setMovies(prev => ({ ...prev, [activeTab]: [] }));
      fetchMovies(1, true);
    }
  }, [appliedFilters, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const categories = {
    trending: '🔥 Trending',
    topRated: '⭐ Top Rated',
    upcoming: '🎬 Upcoming',
    nowPlaying: '🎯 Now Playing'
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12 text-center">
          <h1 className="text-5xl md:text-7xl font-bold cursor-pointer" onClick={resetToHome}>
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              MovieStream
            </span>
          </h1>
        </header>

        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  if (!value.trim()) {
                    // This will trigger the searchMovies function with an empty query
                    searchMovies('');
                  }
                }}
                placeholder="Search for movies..."
                className="flex-1 px-6 py-3 rounded-full bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-6 py-3 rounded-full transition-all ${
                  showFilters ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="absolute z-10 w-full mt-2 p-4 rounded-lg bg-gray-800 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Media Type</label>
                    <select
                      value={filters.mediaType}
                      onChange={(e) => setFilters({ ...filters, mediaType: e.target.value })}
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All</option>
                      <option value="movie">Movies Only</option>
                      <option value="tv">TV Shows Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
                    <select
                      value={filters.genre}
                      onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All Genres</option>
                      {filters.mediaType === 'movie' && genres.movie.map(genre => (
                        <option key={genre.id} value={genre.id}>{genre.name}</option>
                      ))}
                      {filters.mediaType === 'tv' && genres.tv.map(genre => (
                        <option key={genre.id} value={genre.id}>{genre.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
                    <select
                      value={filters.year}
                      onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All Years</option>
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="popularity.desc">Popularity (High to Low)</option>
                      <option value="popularity.asc">Popularity (Low to High)</option>
                      <option value="vote_average.desc">Rating (High to Low)</option>
                      <option value="vote_average.asc">Rating (Low to High)</option>
                      <option value="release_date.desc">Release Date (Newest)</option>
                      <option value="release_date.asc">Release Date (Oldest)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end items-center gap-4 mt-4">
                  {/* Update the Reset Filters button to also refresh the view */}
                  <button
                    onClick={() => {
                      setFilters({
                        mediaType: 'all',
                        genre: 'all',
                        year: 'all',
                        sortBy: 'popularity.desc'
                      });
                      setAppliedFilters({
                        mediaType: 'all',
                        genre: 'all',
                        year: 'all',
                        sortBy: 'popularity.desc'
                      });
                      setShowFilters(false);
                      if (searchQuery) {
                        searchMovies(searchQuery);
                      } else {
                        setPage(1);
                        setMovies(prev => ({ ...prev, [activeTab]: [] }));
                        fetchMovies(1, true);
                      }
                    }}
                    className="px-4 py-2 text-sm text-gray-300 hover:text-white"
                  >
                    Reset Filters
                  </button>
                  {/* Update the Apply Filters button to handle both search and main view */}
                  <button
                    onClick={() => {
                      setAppliedFilters(filters);
                      setShowFilters(false);
                      if (searchQuery) {
                        searchMovies(searchQuery);
                      } else {
                        setPage(1);
                        setMovies(prev => ({ ...prev, [activeTab]: [] }));
                        fetchMovies(1, true);
                      }
                    }}
                    className="px-6 py-2 bg-purple-500 text-white rounded-full text-sm font-medium hover:bg-purple-600 transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isSearching && (
          <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
            {Object.entries(categories).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-6 py-3 rounded-full whitespace-nowrap transition-all ${
                  activeTab === key
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <main>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isSearching
              ? searchResults.map((content, index) => (
                  <div
                    key={`search-${content.id}-${content.media_type}`}
                    className="relative group rounded-xl overflow-hidden shadow-xl transform transition-all duration-300 hover:scale-105"
                  >
                    <div className="aspect-[2/3] relative">
                      <Image
                        src={content.poster_path 
                          ? `https://image.tmdb.org/t/p/w500${content.poster_path}`
                          : '/no-poster.png'
                        }
                        alt={content.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                      {content.media_type === 'tv' && (
                        <div className="absolute top-2 right-2 bg-purple-500 px-2 py-1 rounded-md text-xs font-semibold">
                          TV Series
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 p-4">
                        <h3 className="text-lg font-bold mb-1">{content.title}</h3>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-yellow-400">⭐</span>
                          <span>{content.vote_average?.toFixed(1)}</span>
                          <span>•</span>
                          <span>{content.release_date?.split('-')[0]}</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-300 line-clamp-3">
                          {content.overview}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              : movies[activeTab]?.map((content, index) => (
                  <div
                    key={`${content.id}-${index}`}
                    ref={index === movies[activeTab].length - 1 ? lastMovieRef : null}
                    className="relative group rounded-xl overflow-hidden shadow-xl transform transition-all duration-300 hover:scale-105"
                  >
                    <div className="aspect-[2/3] relative">
                      <Image
                        src={content.poster_path 
                          ? `https://image.tmdb.org/t/p/w500${content.poster_path}`
                          : '/no-poster.png'
                        }
                        alt={content.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                      {content.media_type === 'tv' && (
                        <div className="absolute top-2 right-2 bg-purple-500 px-2 py-1 rounded-md text-xs font-semibold">
                          TV Series
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 p-4">
                        <h3 className="text-lg font-bold mb-1">{content.title}</h3>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-yellow-400">⭐</span>
                          <span>{content.vote_average?.toFixed(1)}</span>
                          <span>•</span>
                          <span>{content.release_date?.split('-')[0]}</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-300 line-clamp-3">
                          {content.overview}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
          
          {!isSearching && loading && (
            <div className="flex justify-center mt-8" ref={loadingRef}>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          )}
          
          {!isSearching && !hasMore && !loading && (
            <div className="text-center mt-8 text-gray-400">
              No more movies to load
            </div>
          )}

          {isSearching && searchResults.length === 0 && !loading && (
            <div className="text-center mt-8 text-gray-400">
              No movies found matching your search
            </div>
          )}
        </main>
      </div>
    </div>
  );
}