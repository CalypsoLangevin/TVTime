import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Discover } from './pages/Discover';
import { SearchPage } from './pages/Search';
import { Movies } from './pages/Movies';
import { MovieDetail } from './pages/MovieDetail';
import { Shows } from './pages/Shows';
import { ShowDetail } from './pages/ShowDetail';
import { Watchlist } from './pages/Watchlist';
import { Stats } from './pages/Stats';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <Routes>
          <Route path="/" element={<Discover />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/shows" element={<Shows />} />
          <Route path="/tv/:id" element={<ShowDetail />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
