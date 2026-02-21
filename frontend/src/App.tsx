import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';

function App() {
  return (
    <Layout>
      <HomePage />
      <Toaster position="bottom-right" />
    </Layout>
  );
}

export default App;
