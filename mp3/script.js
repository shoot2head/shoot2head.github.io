// shoot2head.mp3 - Complete Spotify-style player

// ============ DATA ============
const artists = {
  prabir: { id: 'prabir', name: 'Prabir', image: 'logo.png', bio: 'Prabir creates atmospheric electronic soundscapes blending ambient textures with rhythmic pulses. Based in the studio, crafting demo tracks for the next generation of listeners.' },
  abhijit: { id: 'abhijit', name: 'Abhijit', image: 'logo.png', bio: 'Abhijit explores the intersection of melody and machine. From late-night synth sessions to sunrise mixes, each track is a journey through sound.' }
};

// Demo tracks - single editable array for future audio server
const trackList = [
  { id: 1, title: 'Dreamy Tone', artist: 'Prabir', artistId: 'prabir', duration: '2:45', durationSec: 165, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', album: 'Midnight Sessions', albumId: 'album1', playlistIds: ['playlist1'] },
  { id: 2, title: 'Upbeat Demo', artist: 'Prabir', artistId: 'prabir', duration: '3:12', durationSec: 192, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', album: 'Midnight Sessions', albumId: 'album1', playlistIds: ['playlist1', 'playlist3'] },
  { id: 3, title: 'Midnight Chill', artist: 'Prabir', artistId: 'prabir', duration: '4:20', durationSec: 260, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', album: 'Midnight Sessions', albumId: 'album1', playlistIds: ['playlist2'] },
  { id: 4, title: 'Neon Dreams', artist: 'Prabir', artistId: 'prabir', duration: '3:45', durationSec: 225, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', album: 'Midnight Sessions', albumId: 'album1', playlistIds: ['playlist2'] },
  { id: 5, title: 'Echo Chamber', artist: 'Prabir', artistId: 'prabir', duration: '2:58', durationSec: 178, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', album: 'Midnight Sessions', albumId: 'album1', playlistIds: ['playlist3'] },
  { id: 6, title: 'Solar Flare', artist: 'Abhijit', artistId: 'abhijit', duration: '3:30', durationSec: 210, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', album: 'Electric Sunrise', albumId: 'album2', playlistIds: ['playlist1', 'playlist3'] },
  { id: 7, title: 'Binary Sunset', artist: 'Abhijit', artistId: 'abhijit', duration: '4:15', durationSec: 255, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', album: 'Electric Sunrise', albumId: 'album2', playlistIds: ['playlist2'] },
  { id: 8, title: 'Circuit Breaker', artist: 'Abhijit', artistId: 'abhijit', duration: '3:05', durationSec: 185, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', album: 'Electric Sunrise', albumId: 'album2', playlistIds: ['playlist1'] },
  { id: 9, title: 'Digital Horizon', artist: 'Abhijit', artistId: 'abhijit', duration: '3:50', durationSec: 230, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', album: 'Electric Sunrise', albumId: 'album2', playlistIds: ['playlist3'] },
  { id: 101, title: 'Tu Mil Jaaye (From "KING")', artist: 'Sachin-Jigar, Ed Sheeran, Arijit Singh, Kumaar, Madhubanti Bagchi', artistId: '', duration: '5:15', durationSec: 315, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717121/shoot2head-mp3/Tu_Mil_Jaaye_From_KING.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 102, title: 'Mangal Rang (From "Ramayana")', artist: 'A.R. Rahman, Arijit Singh, Shreya Ghoshal, Kumar Vishwas', artistId: '', duration: '4:37', durationSec: 277, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717041/shoot2head-mp3/Mangal_Rang_From_Ramayana.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 103, title: 'Mahiya', artist: 'Badshah, Shreya Ghoshal, Hiten', artistId: '', duration: '2:29', durationSec: 149, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717026/shoot2head-mp3/Mahiya.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 104, title: 'Dard-e-Dil Dard-e-Jigar (From "Gunmaaster G9")', artist: 'Himesh Reshammiya, AKASA, Sonia Kapoor Reshammiya', artistId: '', duration: '5:24', durationSec: 324, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716946/shoot2head-mp3/Dard-e-Dil_Dard-e-Jigar_From_Gunmaaster_G9.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 105, title: 'Main Ram (From "Ramayana")', artist: 'Prateek Walia, Sachet Tandon, Kumar Vishwas', artistId: '', duration: '3:41', durationSec: 221, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717032/shoot2head-mp3/Main_Ram_From_Ramayana.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 106, title: 'Teri Sexy Beauty (From "Maatrubhumi: May War Rest in Peace")', artist: 'Salman Khan, Muskaan, Sajid Khan', artistId: '', duration: '3:34', durationSec: 214, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717115/shoot2head-mp3/Teri_Sexy_Beauty_From_Maatrubhumi_May_War_Rest_in_Peace.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 107, title: 'Do Din Ki Zindagi (From "Gunmaaster G9")', artist: 'Himesh Reshammiya, Shreya Ghoshal, Vishal Mishra, Junaid Wasi', artistId: '', duration: '5:38', durationSec: 338, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716968/shoot2head-mp3/Do_Din_Ki_Zindagi_From_Gunmaaster_G9.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 108, title: 'Chann (From "Udta Teer")', artist: 'Sachin-Jigar, Arijit Singh, Amitabh Bhattacharya', artistId: '', duration: '3:38', durationSec: 218, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716939/shoot2head-mp3/Chann_From_Udta_Teer.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 109, title: 'OO EY', artist: 'Nikhita Gandhi', artistId: '', duration: '1:56', durationSec: 116, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717050/shoot2head-mp3/OO_EY.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 110, title: 'Mudd Na Sajna', artist: 'Madhubanti Bagchi, Siddharth Amit Bhavsar', artistId: '', duration: '3:52', durationSec: 232, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717043/shoot2head-mp3/Mudd_Na_Sajna.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 111, title: 'Judi Jodi (From "Ramayana")', artist: 'A.R. Rahman, Shreya Ghoshal, Kumar Vishwas', artistId: '', duration: '3:59', durationSec: 239, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717004/shoot2head-mp3/Judi_Jodi_From_Ramayana.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 112, title: 'Saawan Aaya Hai (From "Yeh Prem Mol Liya")', artist: 'Himesh Reshammiya, Shreya Ghoshal, Keshav Anand, Mayur Puri', artistId: '', duration: '4:21', durationSec: 261, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717083/shoot2head-mp3/Saawan_Aaya_Hai_From_Yeh_Prem_Mol_Liya.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 113, title: 'Daur E Aashiqui', artist: 'Salman Ali, Anushkaa Banerjee, Shabbir Ahmed', artistId: '', duration: '4:46', durationSec: 286, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716952/shoot2head-mp3/Daur_E_Aashiqui.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 114, title: 'Shree Hanuman Chalisa (From "Ramayana")', artist: 'A.R. Rahman, Shankar Mahadevan, Diljit Dosanjh, Sukhwinder Singh, Mohit Chauhan, Kailash Kher', artistId: '', duration: '6:58', durationSec: 418, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717091/shoot2head-mp3/Shree_Hanuman_Chalisa_From_Ramayana.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 115, title: 'Mahiya Ve', artist: 'Varun Jain', artistId: '', duration: '2:58', durationSec: 178, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717019/shoot2head-mp3/Mahiya_Ve.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 116, title: 'Ravana Tandav (From "Ramayana") [Hindi]', artist: 'A.R. Rahman, Vishal Dadlani, Kumar Vishwas', artistId: '', duration: '3:14', durationSec: 194, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717068/shoot2head-mp3/Ravana_Tandav_From_Ramayana_Hindi.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 117, title: 'Jhumka Patola (From "Yeh Prem Mol Liya")', artist: 'Himesh Reshammiya, Shreya Ghoshal, Sonia Kapoor Reshammiya', artistId: '', duration: '4:47', durationSec: 287, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716992/shoot2head-mp3/Jhumka_Patola_From_Yeh_Prem_Mol_Liya.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 118, title: 'SUMWALI DAAV (From "Trap Aiba")', artist: 'Emiway Bantai', artistId: '', duration: '2:43', durationSec: 163, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717072/shoot2head-mp3/SUMWALI_DAAV_From_Trap_Aiba.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 119, title: 'Jaan-E-Jaan (From "Between Distances")', artist: 'Aditya Rikhari, Farhan Khan, Ravator', artistId: '', duration: '2:27', durationSec: 147, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716981/shoot2head-mp3/Jaan-E-Jaan_From_Between_Distances.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 120, title: 'Saanwre', artist: 'Raj Barman, Sameer Husain', artistId: '', duration: '3:20', durationSec: 200, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717077/shoot2head-mp3/Saanwre.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 121, title: 'Teri Ore', artist: 'Palak Muchhal, Shahid Mallya, Javed-Mohsin, Vishal Pandey, Sheetal Sharma', artistId: '', duration: '4:08', durationSec: 248, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717111/shoot2head-mp3/Teri_Ore.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 122, title: 'Tab Se', artist: 'Raghav Chaitanya, Mehtab Ali Niazi', artistId: '', duration: '4:44', durationSec: 284, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717105/shoot2head-mp3/Tab_Se.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 123, title: 'Rani Tu Hi Diwali', artist: 'Manan Bhardwaj', artistId: '', duration: '2:32', durationSec: 152, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717063/shoot2head-mp3/Rani_Tu_Hi_Diwali.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 124, title: 'O Mysaa Re (From "Mysaa") [Hindi]', artist: 'Jakes Bejoy, Sindhuja Srinivasan, Neha Sandeep Shitole', artistId: '', duration: '4:39', durationSec: 279, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717045/shoot2head-mp3/O_Mysaa_Re_From_Mysaa_Hindi.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 125, title: 'Aaj Sajeya Ve', artist: 'Abhay Jodhpurkar, Jay Mehta, Rini Chandra', artistId: '', duration: '3:33', durationSec: 213, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716920/shoot2head-mp3/Aaj_Sajeya_Ve.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 126, title: 'Fidaa', artist: 'Arslan Nizami', artistId: '', duration: '3:11', durationSec: 191, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716973/shoot2head-mp3/Fidaa.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 127, title: 'Dil Mera Rota Chala Jaye', artist: 'Krish Mondal, Kishore Mondal, Jyotica Tangri, Amol- Abhishek, Amol Shrivastava, Abhishek Talented', artistId: '', duration: '3:15', durationSec: 195, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716963/shoot2head-mp3/Dil_Mera_Rota_Chala_Jaye.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 128, title: 'Karam Farma De (From "Meethe Mein Kya Hai")', artist: 'Kumaar, Amit Trivedi, Shahid Mallya', artistId: '', duration: '3:24', durationSec: 204, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717010/shoot2head-mp3/Karam_Farma_De_From_Meethe_Mein_Kya_Hai.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 129, title: 'Dhola Ji (From "Suryaa")', artist: 'Shreya Ghoshal, Javed Ali, Swaroop Khan', artistId: '', duration: '5:19', durationSec: 319, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716959/shoot2head-mp3/Dhola_Ji_From_Suryaa.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 130, title: 'Ichak Dana (From "Meethe Mein Kya Hai")', artist: 'Kumaar, Amit Trivedi, Nakash Aziz', artistId: '', duration: '2:43', durationSec: 163, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716977/shoot2head-mp3/Ichak_Dana_From_Meethe_Mein_Kya_Hai.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 131, title: 'So Swaezy', artist: 'Yo Yo Honey Singh, Hommie Dilliwala', artistId: '', duration: '3:25', durationSec: 205, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717096/shoot2head-mp3/So_Swaezy.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 132, title: 'MERI KISMAT MEIN', artist: 'Raj Barman, Shabab Azmi', artistId: '', duration: '2:42', durationSec: 162, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717014/shoot2head-mp3/MERI_KISMAT_MEIN.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 133, title: 'RUDE', artist: 'Nikhita Gandhi, Dino James', artistId: '', duration: '2:45', durationSec: 165, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717059/shoot2head-mp3/RUDE.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 134, title: 'Baarish', artist: 'Raj Barman, Rubai', artistId: '', duration: '3:42', durationSec: 222, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716925/shoot2head-mp3/Baarish.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 135, title: 'Begum Bewafa', artist: 'Sonu Nigam, Bosco Martis, Vishie, Vikas Bedi, Aditya Seal', artistId: '', duration: '3:25', durationSec: 205, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716929/shoot2head-mp3/Begum_Bewafa.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 136, title: 'Promise', artist: 'Sachet Tandon, Parampara Tandon, Kausar Munir, Sachet-Parampara', artistId: '', duration: '3:11', durationSec: 191, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717054/shoot2head-mp3/Promise.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 137, title: 'Jai Hind (From "Maatrubhumi: May War Rest in Peace")', artist: 'Himesh Reshammiya, Stebin Ben, Sameer Anjaan', artistId: '', duration: '6:28', durationSec: 388, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716988/shoot2head-mp3/Jai_Hind_From_Maatrubhumi_May_War_Rest_in_Peace.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 138, title: 'Bin Kasoor', artist: 'AKASA, Aniket Shukla', artistId: '', duration: '2:44', durationSec: 164, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716933/shoot2head-mp3/Bin_Kasoor.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 139, title: 'Suniyo Zara (From "Suryaa")', artist: 'Kumar Sanu, Udit Narayan, Anupam Amod, RAAHEE', artistId: '', duration: '4:10', durationSec: 250, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717099/shoot2head-mp3/Suniyo_Zara_From_Suryaa.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 140, title: 'Makhmali', artist: 'Rito Riba, Saaheal', artistId: '', duration: '3:00', durationSec: 180, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794717034/shoot2head-mp3/Makhmali.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
  { id: 141, title: 'Joganiya', artist: 'Rito Riba, Siddhant Kaushal', artistId: '', duration: '3:05', durationSec: 185, audioUrl: 'https://res.cloudinary.com/zpu6kgau/video/upload/v1794716996/shoot2head-mp3/Joganiya.mp3', album: 'Taaza Tunes', albumId: '', playlistIds: ['taaza-tunes'] },
];

const playlists = [
  { id: 'playlist1', title: 'Late Night Coding', description: 'Perfect beats for deep focus sessions', cover: 'logo.png', trackIds: [1, 2, 6, 8], owner: 'You' },
  { id: 'playlist2', title: 'Chill Vibes Only', description: 'Wind down with atmospheric sounds', cover: 'logo.png', trackIds: [3, 4, 7], owner: 'You' },
  { id: 'playlist3', title: 'Weekend Energy', description: 'High energy tracks for the weekend', cover: 'logo.png', trackIds: [2, 5, 6, 9], owner: 'You' },
  { id: 'taaza-tunes', title: 'Taaza Tunes', description: 'Latest Songs • Just Updated', cover: 'logo.png', trackIds: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141], owner: 'shoot2head' },
];

const albums = [
  { id: 'album1', title: 'Midnight Sessions', artist: 'Prabir', artistId: 'prabir', cover: 'logo.png', year: '2024', trackIds: [1, 2, 3, 4, 5] },
  { id: 'album2', title: 'Electric Sunrise', artist: 'Abhijit', artistId: 'abhijit', cover: 'logo.png', year: '2024', trackIds: [6, 7, 8, 9] },
];

const categories = [
  { id: 'chill', name: 'Chill', cover: 'logo.png' },
  { id: 'focus', name: 'Focus', cover: 'logo.png' },
  { id: 'energy', name: 'Energy', cover: 'logo.png' },
  { id: 'electronic', name: 'Electronic', cover: 'logo.png' },
];

// ============ ONLINE SEARCH — free sources, tried in order ============
// No service name is ever shown in the UI. Online results look like the app's own songs.
const SEARCH_SOURCES = [
  { name: 'invidious', url: q => `https://yt.chocolatemoo53.com/api/v1/search?q=${encodeURIComponent(q)}&type=video` },
  { name: 'lemnoslife', url: q => `https://yt.lemnoslife.com/search?q=${encodeURIComponent(q)}` },
  { name: 'saavn', url: q => `https://corsproxy.io/?url=${encodeURIComponent('https://saavn.dev/api/search/songs?query=' + encodeURIComponent(q) + '&limit=10')}` },
];
let onlineResults = [];   // normalized track objects from the online search
let searchSeq = 0;         // guards against stale responses
let searchTimer = null;

function fetchWithTimeout(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal })
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .finally(() => clearTimeout(t));
}

function normalizeInvidious(items) {
  return (items || []).filter(i => i && i.type === 'video' && i.videoId).map(i => ({
    id: 'yt_' + i.videoId, title: i.title || 'Unknown', artist: i.author || '',
    durationSec: i.lengthSeconds || 0, duration: formatTime(i.lengthSeconds || 0),
    videoId: i.videoId, source: 'youtube',
    cover: (i.videoThumbnails && i.videoThumbnails.length ? i.videoThumbnails[i.videoThumbnails.length - 1].url : '') || ('https://i.ytimg.com/vi/' + i.videoId + '/hqdefault.jpg'),
    album: '', albumId: '', playlistIds: [],
  }));
}

function normalizeLemnoslife(data) {
  const items = Array.isArray(data) ? data : (data.items || data.results || []);
  return (items || []).filter(i => i && (i.id || i.videoId)).map(i => {
    const vid = i.videoId || i.id;
    const th = i.thumbnails && i.thumbnails.length ? i.thumbnails[i.thumbnails.length - 1] : null;
    return {
      id: 'yt_' + vid, title: i.title || 'Unknown',
      artist: (i.channel && (i.channel.name || i.channel)) || i.author || '',
      durationSec: i.duration || 0, duration: formatTime(i.duration || 0),
      videoId: vid, source: 'youtube',
      cover: (th && (th.url || th)) || ('https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg'),
      album: '', albumId: '', playlistIds: [],
    };
  });
}

function normalizeSaavn(data) {
  const results = (data && data.data && data.data.results) || [];
  return results.filter(r => r && r.id).map(r => {
    const dl = (r.downloadUrl || []).slice().sort((a, b) => parseInt(b.quality) - parseInt(a.quality))[0];
    const img = (r.image || []).slice(-1)[0];
    return {
      id: 'sv_' + r.id, title: r.name || 'Unknown',
      artist: (r.artists && r.artists.primary && r.artists.primary.map(a => a.name).join(', ')) || '',
      durationSec: r.duration || 0, duration: formatTime(r.duration || 0),
      audioUrl: dl ? dl.url : '', source: 'saavn',
      cover: img ? img.url : 'logo.png', album: '', albumId: '', playlistIds: [],
    };
  }).filter(t => t.audioUrl);
}

async function searchOnline(query, seq) {
  for (const src of SEARCH_SOURCES) {
    const data = await fetchWithTimeout(src.url(query));
    if (seq !== searchSeq) return; // a newer search started
    if (!data) continue;
    let tracks = [];
    try {
      if (src.name === 'invidious') tracks = normalizeInvidious(data);
      else if (src.name === 'lemnoslife') tracks = normalizeLemnoslife(data);
      else if (src.name === 'saavn') tracks = normalizeSaavn(data);
    } catch (e) { tracks = []; }
    if (tracks.length) { onlineResults = tracks; renderOnlineResults(); return; }
  }
  if (seq === searchSeq) { onlineResults = []; renderOnlineResults(); }
}

function renderOnlineResults() {
  const grid = document.getElementById('searchOnlineGrid');
  const status = document.getElementById('onlineStatus');
  if (!grid) return;
  if (!onlineResults.length) { grid.innerHTML = ''; if (status) status.textContent = 'No more songs found.'; return; }
  if (status) status.textContent = '';
  grid.innerHTML = onlineResults.map(t => createCard(t, 'track')).join('');
  attachCardListeners(grid);
}

// ============ HIDDEN AUDIO ENGINE (plays online songs, no video shown) ============
let ytPlayer = null;
let ytReady = false;
let ytLoading = false;
let activeEngine = 'audio'; // 'audio' = built-in player, 'youtube' = hidden player
let ytProgressTimer = null;

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (ytPlayer) return resolve(true);
    if (window.YT && window.YT.Player) { initYouTubePlayer(); return resolve(true); }
    if (ytLoading) {
      const wait = setInterval(() => { if (ytPlayer) { clearInterval(wait); resolve(true); } }, 300);
      setTimeout(() => { clearInterval(wait); resolve(false); }, 15000);
      return;
    }
    ytLoading = true;
    window.onYouTubeIframeAPIReady = () => { initYouTubePlayer(); resolve(true); };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => resolve(false);
    document.head.appendChild(tag);
    setTimeout(() => resolve(false), 15000);
  });
}

function initYouTubePlayer() {
  if (ytPlayer) return;
  try {
    ytPlayer = new YT.Player('ytPlayer', {
      width: '1', height: '1',
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0, playsinline: 1 },
      events: {
        onReady: () => { ytReady = true; },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) handleTrackEnded();
          else if (e.data === YT.PlayerState.PLAYING) { isPlaying = true; updatePlayButtons(); }
          else if (e.data === YT.PlayerState.PAUSED) { isPlaying = false; updatePlayButtons(); }
        },
      },
    });
  } catch (e) { ytPlayer = null; }
}

function startYtProgress() {
  stopYtProgress();
  ytProgressTimer = setInterval(() => {
    if (activeEngine !== 'youtube' || !ytPlayer || !ytPlayer.getDuration) return;
    const d = ytPlayer.getDuration() || 0;
    const c = ytPlayer.getCurrentTime() || 0;
    if (!d) return;
    const percent = (c / d) * 100;
    const pb = document.getElementById('progressBar'); if (pb) { pb.value = percent; paintProgress(pb, percent); }
    const fpb = document.getElementById('fullscreenProgressBar'); if (fpb) { fpb.value = percent; paintProgress(fpb, percent); }
    const mpb = document.getElementById('modalProgressBar'); if (mpb) { mpb.value = percent; paintProgress(mpb, percent); }
    const tc = document.getElementById('timeCurrent'); if (tc) tc.textContent = formatTime(c);
    const tt = document.getElementById('timeTotal'); if (tt) tt.textContent = formatTime(d);
  }, 500);
}

function stopYtProgress() { if (ytProgressTimer) { clearInterval(ytProgressTimer); ytProgressTimer = null; } }

function setVolume01(v) {
  audio.volume = v;
  if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(Math.round(v * 100));
}

function toTrackId(raw) {
  const n = parseInt(raw, 10);
  return String(n) === String(raw) ? n : raw;
}

function findTrackById(id) {
  const tid = toTrackId(id);
  return trackList.find(t => t.id === tid) || onlineResults.find(t => t.id === tid) || null;
}

function playTrackObjects(tracks, startIndex = 0) {
  queue = tracks.slice();
  if (!queue.length) return;
  playTrack(startIndex);
  navigateTo('fullscreenNowPlaying');
  renderQueue();
}

// ============ DOWNLOADS — 1 GB limit, saves to the phone's Downloads folder ============
const DOWNLOAD_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB
const DOWNLOAD_KEY = 'shoot2head_downloaded_bytes';

function getDownloadedBytes() {
  return parseInt(localStorage.getItem(DOWNLOAD_KEY) || '0', 10) || 0;
}
function addDownloadedBytes(n) {
  const total = getDownloadedBytes() + n;
  localStorage.setItem(DOWNLOAD_KEY, String(total));
  updateDownloadsBar();
  return total;
}
function formatBytes(n) {
  if (n === 0) return '0 MB';
  if (n >= 1073741824) return (n / 1073741824).toFixed(2) + ' GB';
  if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
  if (n >= 1024) return Math.round(n / 1024) + ' KB';
  return n + ' B';
}
function updateDownloadsBar() {
  const el = document.getElementById('downloadUsage');
  if (el) el.textContent = formatBytes(getDownloadedBytes()) + ' / 1 GB';
  const bar = document.getElementById('downloadUsageBar');
  if (bar) bar.style.width = Math.min(100, (getDownloadedBytes() / DOWNLOAD_LIMIT_BYTES) * 100) + '%';
}
function setDownloadStatus(msg) {
  const el = document.getElementById('downloadStatus');
  if (!el) return;
  el.textContent = msg;
  clearTimeout(setDownloadStatus._t);
  setDownloadStatus._t = setTimeout(() => { el.textContent = ''; }, 6000);
}
function sanitizeFilename(s) {
  return String(s || 'song').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'song';
}

async function resolveDownload(track) {
  if (track.audioUrl) {
    // Library songs: real MP3 files. HEAD gives the exact size for the limit check.
    let size = null;
    try {
      const head = await fetch(track.audioUrl, { method: 'HEAD' });
      const len = head.headers.get('content-length');
      if (len) size = parseInt(len, 10);
    } catch (e) { /* size unknown — still downloadable */ }
    return { url: track.audioUrl, ext: 'mp3', size };
  }
  if (track.source === 'youtube') {
    // Best audio-only stream, proxied through the same service used for search.
    const data = await fetchWithTimeout(`https://yt.chocolatemoo53.com/api/v1/videos/${track.videoId}?local=true`, 10000);
    if (!data) return null;
    const fmts = (data.adaptiveFormats || []).filter(f => (f.type || '').startsWith('audio/') && f.url);
    if (!fmts.length) return null;
    fmts.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    const best = fmts[0];
    const ext = (best.type || '').includes('webm') ? 'webm' : 'm4a';
    return { url: best.url, ext, size: parseInt(best.clen || '0', 10) || null };
  }
  return null;
}

async function downloadTrack(track, btn) {
  if (!track || (btn && btn.dataset.busy === '1')) return;
  if (btn) { btn.dataset.busy = '1'; btn.textContent = '…'; }
  try {
    const dl = await resolveDownload(track);
    if (!dl) throw new Error('no-audio');
    if (dl.size && getDownloadedBytes() + dl.size > DOWNLOAD_LIMIT_BYTES) {
      setDownloadStatus('1 GB limit reached. Delete some songs from your phone, then press Clear to reset the counter.');
      if (btn) btn.textContent = '⬇';
      return;
    }
    const res = await fetch(dl.url);
    if (!res.ok) throw new Error('fetch-failed');
    const total = dl.size || parseInt(res.headers.get('content-length') || '0', 10) || 0;
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (btn && total) btn.textContent = Math.round((received / total) * 100) + '%';
    }
    if (getDownloadedBytes() + received > DOWNLOAD_LIMIT_BYTES) {
      setDownloadStatus('This song would go over the 1 GB limit. It was not saved.');
      if (btn) btn.textContent = '⬇';
      return;
    }
    const blob = new Blob(chunks, { type: dl.ext === 'mp3' ? 'audio/mpeg' : 'audio/webm' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = sanitizeFilename(track.title + ' - ' + track.artist) + '.' + dl.ext;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    addDownloadedBytes(received);
    setDownloadStatus('Saved to Downloads: ' + a.download);
    if (btn) btn.textContent = '✓';
  } catch (e) {
    console.log('Download failed:', e);
    setDownloadStatus('Download failed. Check your connection and try again — or just play the song instead.');
    if (btn) btn.textContent = '⬇';
  } finally {
    if (btn) delete btn.dataset.busy;
  }
}

// ============ STATE ============
let currentTrackIndex = 0;
let isPlaying = false;
let currentView = 'home';
let navigationHistory = ['home'];
let currentPlaylistId = null;
let currentAlbumId = null;
let currentArtistId = null;
let queue = [];
let shuffle = false;
let repeat = 0; // 0=off, 1=all, 2=one
let likedTracks = new Set();
let userPlaylists = [...playlists];

// Audio element
const audio = new Audio();
audio.volume = 0.8;

// ============ DOM ELEMENTS ============
const viewContainer = document.getElementById('viewContainer');
const nowPlayingBar = document.getElementById('nowPlayingBar');
const trackModal = document.getElementById('trackModal');
const createPlaylistModal = document.getElementById('createPlaylistModal');

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  loadLikedTracks();
  initEventListeners();
  renderAll();
  setupAudioEvents();
  updateNowPlayingBar();
  updateDownloadsBar();
  document.getElementById('resetDownloadsBtn')?.addEventListener('click', () => {
    localStorage.removeItem(DOWNLOAD_KEY);
    updateDownloadsBar();
    setDownloadStatus('Download counter cleared. Delete the files from your phone too if you already removed them.');
  });
});

// ============ EVENT LISTENERS ============
function initEventListeners() {
  // Sidebar navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });

  // Now playing bar controls
  document.getElementById('playBtn').addEventListener('click', () => playPause());
  document.getElementById('pauseBtn').addEventListener('click', () => playPause());
  document.getElementById('nextBtn').addEventListener('click', () => playNext());
  document.getElementById('prevBtn').addEventListener('click', () => playPrev());
  document.getElementById('progressBar').addEventListener('input', (e) => { paintProgress(e.target, e.target.value); seek(e.target.value); });
  document.getElementById('volumeControl').addEventListener('input', (e) => setVolume01(e.target.value / 100));
  document.getElementById('queueBtn').addEventListener('click', () => navigateTo('fullscreenNowPlaying'));

  // Fullscreen now playing
  document.getElementById('closeFullscreen').addEventListener('click', () => goBack());
  document.getElementById('fsPlayBtn').addEventListener('click', () => playPause());
  document.getElementById('fsPauseBtn').addEventListener('click', () => playPause());
  document.getElementById('fsPrevBtn').addEventListener('click', () => playPrev());
  document.getElementById('fsNextBtn').addEventListener('click', () => playNext());
  document.getElementById('fullscreenProgressBar').addEventListener('input', (e) => seek(e.target.value));
  document.getElementById('fsVolumeControl').addEventListener('input', (e) => setVolume01(e.target.value / 100));
  document.getElementById('shuffleBtn').addEventListener('click', toggleShuffle);
  document.getElementById('repeatBtn').addEventListener('click', toggleRepeat);
  document.getElementById('clearQueueBtn').addEventListener('click', clearQueue);

  // Track modal
  document.querySelector('#trackModal .close-btn').addEventListener('click', () => closeModal());
  document.getElementById('modalPlayBtn').addEventListener('click', () => playPause());
  document.getElementById('modalProgressBar').addEventListener('input', (e) => seek(e.target.value));
  trackModal.addEventListener('click', (e) => { if (e.target === trackModal) closeModal(); });

  // Create playlist modal
  document.querySelector('#createPlaylistModal .close-btn').addEventListener('click', () => closeCreatePlaylistModal());
  document.getElementById('cancelCreatePlaylist').addEventListener('click', () => closeCreatePlaylistModal());
  document.getElementById('confirmCreatePlaylist').addEventListener('click', createPlaylist);
  createPlaylistModal.addEventListener('click', (e) => { if (e.target === createPlaylistModal) closeCreatePlaylistModal(); });

  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => performSearch(e.target.value));

  // Library filters
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderLibrary(chip.dataset.filter);
    });
  });

  // Create playlist button
  document.getElementById('createPlaylistBtn').addEventListener('click', () => openCreatePlaylistModal());

  // Back buttons
  document.getElementById('playlistBackBtn').addEventListener('click', () => goBack());
  document.getElementById('albumBackBtn').addEventListener('click', () => goBack());
  document.getElementById('artistBackBtn').addEventListener('click', () => goBack());
  document.getElementById('likedBackBtn').addEventListener('click', () => goBack());

  // Play all buttons
  document.getElementById('playlistPlayAll').addEventListener('click', () => playPlaylist(currentPlaylistId));
  document.getElementById('albumPlayAll').addEventListener('click', () => playAlbum(currentAlbumId));
  document.getElementById('artistPlayAll').addEventListener('click', () => playArtistTopTracks(currentArtistId));

  // Save/Follow buttons
  document.getElementById('playlistSave').addEventListener('click', () => toggleSavePlaylist(currentPlaylistId));
  document.getElementById('albumSave').addEventListener('click', () => toggleSaveAlbum(currentAlbumId));
  document.getElementById('artistFollow').addEventListener('click', () => toggleFollowArtist(currentArtistId));

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') { e.preventDefault(); playPause(); }
    if (e.code === 'ArrowRight') playNext();
    if (e.code === 'ArrowLeft') playPrev();
    if (e.code === 'ArrowUp') audio.volume = Math.min(1, audio.volume + 0.1);
    if (e.code === 'ArrowDown') audio.volume = Math.max(0, audio.volume - 0.1);
    if (e.code === 'Escape') { closeModal(); closeCreatePlaylistModal(); if (currentView !== 'home') goBack(); }
  });

  // Click now playing bar to open fullscreen
  nowPlayingBar.addEventListener('click', (e) => {
    if (!e.target.closest('.btn') && !e.target.closest('.progress') && !e.target.closest('.volume') && !e.target.closest('.queue')) {
      navigateTo('fullscreenNowPlaying');
    }
  });
}

// ============ AUDIO ============
function setupAudioEvents() {
  audio.addEventListener('play', () => { isPlaying = true; updatePlayButtons(); });
  audio.addEventListener('pause', () => { isPlaying = false; updatePlayButtons(); });
  audio.addEventListener('ended', () => handleTrackEnded());
  audio.addEventListener('timeupdate', () => updateProgress());
  audio.addEventListener('loadedmetadata', () => updateDuration());
}

async function playTrack(index) {
  if (index < 0 || index >= queue.length) return;
  currentTrackIndex = index;
  const track = queue[index];
  if (track.source === 'youtube') {
    audio.pause();
    activeEngine = 'youtube';
    const ok = await loadYouTubeAPI();
    if (ok && ytPlayer && ytPlayer.loadVideoById) {
      let tries = 0;
      while (!ytReady && tries < 20) { await new Promise(r => setTimeout(r, 250)); tries++; }
      ytPlayer.setVolume(Math.round(audio.volume * 100));
      ytPlayer.loadVideoById(track.videoId);
      startYtProgress();
    } else {
      // Hidden player could not start — stop here, do not auto-advance.
      activeEngine = 'audio';
      stopYtProgress();
      isPlaying = false;
      updatePlayButtons();
      return;
    }
  } else {
    if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
    stopYtProgress();
    activeEngine = 'audio';
    audio.src = track.audioUrl;
    audio.play().catch(err => console.log('Playback failed:', err));
  }
  updateNowPlayingBar();
  updateFullscreenNowPlaying();
  updateTrackModal(track);
  renderQueue();
  highlightPlayingTrack();
}

function playPause() {
  if (activeEngine === 'youtube' && ytPlayer && ytPlayer.getPlayerState) {
    const s = ytPlayer.getPlayerState();
    if (s === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
    else ytPlayer.playVideo();
    return;
  }
  if (isPlaying) audio.pause();
  else audio.play().catch(err => console.log('Playback failed:', err));
}

function playNext() {
  if (repeat === 2) { playTrack(currentTrackIndex); return; }
  let nextIndex = currentTrackIndex + 1;
  if (nextIndex >= queue.length) {
    if (repeat === 1) nextIndex = 0;
    else return;
  }
  playTrack(nextIndex);
}

function playPrev() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  let prevIndex = currentTrackIndex - 1;
  if (prevIndex < 0) {
    if (repeat === 1) prevIndex = queue.length - 1;
    else return;
  }
  playTrack(prevIndex);
}

function seek(percent) {
  if (activeEngine === 'youtube' && ytPlayer && ytPlayer.getDuration) {
    const d = ytPlayer.getDuration() || 0;
    if (d) ytPlayer.seekTo((percent / 100) * d, true);
    return;
  }
  if (audio.duration) audio.currentTime = (percent / 100) * audio.duration;
}

function handleTrackEnded() {
  if (repeat === 2) { audio.currentTime = 0; audio.play(); return; }
  playNext();
}

function updateProgress() {
  if (!audio.duration) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  const pb = document.getElementById('progressBar'); pb.value = percent; paintProgress(pb, percent);
  const fpb = document.getElementById('fullscreenProgressBar'); fpb.value = percent; paintProgress(fpb, percent);
  const mpb = document.getElementById('modalProgressBar'); mpb.value = percent; paintProgress(mpb, percent);
  document.getElementById('timeCurrent').textContent = formatTime(audio.currentTime);
}

function updateDuration() {
  document.getElementById('timeTotal').textContent = formatTime(audio.duration);
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updatePlayButtons() {
  const showPlay = !isPlaying;
  document.getElementById('playBtn').style.display = showPlay ? 'flex' : 'none';
  document.getElementById('pauseBtn').style.display = showPlay ? 'none' : 'flex';
  document.getElementById('fsPlayBtn').style.display = showPlay ? 'flex' : 'none';
  document.getElementById('fsPauseBtn').style.display = showPlay ? 'none' : 'flex';
}

// ============ NAVIGATION ============
function navigateTo(view, data = {}) {
  if (view === currentView && !data.force) return;
  
  // Update history
  if (view !== currentView) {
    navigationHistory.push(currentView);
  }
  
  // Store data for detail views
  if (data.playlistId) currentPlaylistId = data.playlistId;
  if (data.albumId) currentAlbumId = data.albumId;
  if (data.artistId) currentArtistId = data.artistId;

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  
  // Show target view
  const targetView = document.getElementById(view + 'View');
  if (targetView) targetView.classList.add('active');
  
  // Update sidebar active state
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  currentView = view;
  renderView(view);
  window.scrollTo(0, 0);
}

function goBack() {
  if (navigationHistory.length > 1) {
    navigationHistory.pop(); // remove current
    const prevView = navigationHistory.pop(); // get previous
    navigateTo(prevView, { force: true });
  } else {
    navigateTo('home');
  }
}

function renderView(view) {
  switch (view) {
    case 'home': renderHome(); break;
    case 'search': renderSearch(); break;
    case 'library': renderLibrary('playlists'); break;
    case 'playlistDetail': renderPlaylistDetail(); break;
    case 'albumDetail': renderAlbumDetail(); break;
    case 'artistDetail': renderArtistDetail(); break;
    case 'likedSongs': renderLikedSongs(); break;
    case 'fullscreenNowPlaying': renderFullscreenNowPlaying(); break;
  }
}

// ============ RENDER FUNCTIONS ============
function renderAll() {
  renderHome();
  renderSearch();
  renderLibrary('playlists');
  renderCategories();
  updateNowPlayingBar();
  updateFullscreenNowPlaying();
  renderQueue();
}

function renderHome() {
  // Featured track
  const featuredTrack = trackList[0];
  document.getElementById('featuredCover').src = featuredTrack.audioUrl ? 'logo.png' : 'logo.png';
  document.getElementById('featuredTitle').textContent = featuredTrack.title;
  document.getElementById('featuredArtist').textContent = featuredTrack.artist;
  document.getElementById('featuredCover').onclick = () => openTrackModal(featuredTrack);

  // Card grid - playlists and albums
  const cardGrid = document.getElementById('cardGrid');
  cardGrid.innerHTML = playlists.map(p => createCard(p, 'playlist')).join('') + albums.map(a => createCard(a, 'album')).join('');
  attachCardListeners(cardGrid);

  // Recently played - last 4 unique tracks
  const recentTracks = getRecentlyPlayed();
  const recentGrid = document.getElementById('recentGrid');
  recentGrid.innerHTML = recentTracks.map(t => createCard(t, 'track')).join('');
  attachCardListeners(recentGrid);
}

function renderSearch() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  performSearch(query);
}

function performSearch(query) {
  const q = (query || '').trim();
  const ql = q.toLowerCase();
  const tracksGrid = document.getElementById('searchTracksGrid');
  const artistsGrid = document.getElementById('searchArtistsGrid');
  const playlistsGrid = document.getElementById('searchPlaylistsGrid');
  const onlineSection = document.getElementById('onlineSection');
  const sections = {
    tracks: document.getElementById('tracksSection'),
    artists: document.getElementById('artistsSection'),
    playlists: document.getElementById('playlistsSection'),
  };

  clearTimeout(searchTimer);
  if (!q) {
    Object.values(sections).forEach(s => s.style.display = 'none');
    if (onlineSection) onlineSection.style.display = 'none';
    document.getElementById('browseCategories').style.display = 'block';
    onlineResults = [];
    return;
  }

  document.getElementById('browseCategories').style.display = 'none';
  Object.values(sections).forEach(s => s.style.display = 'block');

  const filteredTracks = trackList.filter(t =>
    t.title.toLowerCase().includes(ql) || t.artist.toLowerCase().includes(ql)
  );
  tracksGrid.innerHTML = filteredTracks.map(t => createCard(t, 'track')).join('');
  attachCardListeners(tracksGrid);

  const artistIds = [...new Set(trackList.filter(t => t.artist.toLowerCase().includes(ql)).map(t => t.artistId))];
  artistsGrid.innerHTML = artistIds.map(id => createCard(artists[id], 'artist')).join('');
  attachCardListeners(artistsGrid);

  const filteredPlaylists = [...playlists, ...userPlaylists].filter(p =>
    p.title.toLowerCase().includes(ql)
  );
  playlistsGrid.innerHTML = filteredPlaylists.map(p => createCard(p, 'playlist')).join('');
  attachCardListeners(playlistsGrid);

  // Online search — all free sources, debounced
  if (onlineSection) {
    onlineSection.style.display = 'block';
    const status = document.getElementById('onlineStatus');
    if (status) status.textContent = 'Searching...';
    document.getElementById('searchOnlineGrid').innerHTML = '';
    const seq = ++searchSeq;
    searchTimer = setTimeout(() => searchOnline(q, seq), 400);
  }
}

function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = categories.map(c => createCard(c, 'category')).join('');
  attachCardListeners(grid);
}

function renderLibrary(filter) {
  const grid = document.getElementById('libraryGrid');
  let items = [];
  let emptyMessage = '';
  let cardType = 'playlist';

  switch (filter) {
    case 'playlists':
      items = [...playlists, ...userPlaylists.filter(p => !playlists.find(op => op.id === p.id))];
      emptyMessage = 'Create your first playlist';
      cardType = 'playlist';
      break;
    case 'artists':
      items = Object.values(artists);
      emptyMessage = 'Follow artists to see them here';
      cardType = 'artist';
      break;
    case 'albums':
      items = albums;
      emptyMessage = 'Save albums to see them here';
      cardType = 'album';
      break;
    case 'liked':
      navigateTo('likedSongs');
      return;
  }

  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">${emptyMessage}</div>`;
  } else {
    grid.innerHTML = items.map(item => createCard(item, cardType)).join('');
    attachCardListeners(grid);
  }
}

function renderPlaylistDetail() {
  const playlist = [...playlists, ...userPlaylists].find(p => p.id === currentPlaylistId);
  if (!playlist) { navigateTo('home'); return; }
  
  document.getElementById('playlistCover').src = playlist.cover;
  document.getElementById('playlistTitle').textContent = playlist.title;
  document.getElementById('playlistDescription').textContent = playlist.description;
  
  const tracks = playlist.trackIds.map(id => trackList.find(t => t.id === id)).filter(Boolean);
  const totalSec = tracks.reduce((sum, t) => sum + t.durationSec, 0);
  document.getElementById('playlistMeta').textContent = `${tracks.length} songs, ${formatTime(totalSec)}`;
  
  const tracksContainer = document.getElementById('playlistTracks');
  tracksContainer.innerHTML = tracks.map((t, i) => createTrackRow(t, i, playlist.trackIds.indexOf(t.id))).join('');
  attachTrackRowListeners(tracksContainer, playlist.trackIds);
}

function renderAlbumDetail() {
  const album = albums.find(a => a.id === currentAlbumId);
  if (!album) { navigateTo('home'); return; }
  
  document.getElementById('albumCover').src = album.cover;
  document.getElementById('albumTitle').textContent = album.title;
  document.getElementById('albumArtist').textContent = album.artist;
  
  const tracks = album.trackIds.map(id => trackList.find(t => t.id === id)).filter(Boolean);
  const totalSec = tracks.reduce((sum, t) => sum + t.durationSec, 0);
  document.getElementById('albumMeta').textContent = `${album.year} • ${tracks.length} songs, ${formatTime(totalSec)}`;
  
  const tracksContainer = document.getElementById('albumTracks');
  tracksContainer.innerHTML = tracks.map((t, i) => createTrackRow(t, i, i)).join('');
  attachTrackRowListeners(tracksContainer, album.trackIds);
}

function renderArtistDetail() {
  const artist = artists[currentArtistId];
  if (!artist) { navigateTo('home'); return; }
  
  document.getElementById('artistCover').src = artist.image;
  document.getElementById('artistName').textContent = artist.name;
  document.getElementById('artistAbout').textContent = artist.bio;
  
  const artistTracks = trackList.filter(t => t.artistId === currentArtistId);
  document.getElementById('artistMeta').textContent = `${artistTracks.length} tracks • ${formatTime(artistTracks.reduce((s, t) => s + t.durationSec, 0))}`;
  
  // Top tracks (first 5)
  const topTracks = artistTracks.slice(0, 5);
  document.getElementById('artistTopTracks').innerHTML = topTracks.map((t, i) => createTrackRow(t, i, i)).join('');
  attachTrackRowListeners(document.getElementById('artistTopTracks'), topTracks.map(t => t.id));
  
  // Discography
  const artistAlbums = albums.filter(a => a.artistId === currentArtistId);
  document.getElementById('artistDiscography').innerHTML = artistAlbums.map(a => createCard(a, 'album')).join('');
  attachCardListeners(document.getElementById('artistDiscography'));
}

function renderLikedSongs() {
  const likedTrackObjects = trackList.filter(t => likedTracks.has(t.id));
  document.getElementById('likedMeta').textContent = `${likedTrackObjects.length} song${likedTrackObjects.length !== 1 ? 's' : ''}`;
  
  const container = document.getElementById('likedTracks');
  if (likedTrackObjects.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding: 40px; text-align: center; color: #888;">No liked songs yet. Click the heart on any track to add it here.</div>';
  } else {
    container.innerHTML = likedTrackObjects.map((t, i) => createTrackRow(t, i, trackList.indexOf(t), true)).join('');
    attachTrackRowListeners(container, likedTrackObjects.map(t => t.id), true);
  }
}

function renderFullscreenNowPlaying() {
  updateFullscreenNowPlaying();
  renderQueue();
}

function updateFullscreenNowPlaying() {
  if (queue.length === 0) return;
  const track = queue[currentTrackIndex];
  document.getElementById('fullscreenCover').src = track.cover || 'logo.png';
  document.getElementById('fullscreenTitle').textContent = track.title;
  document.getElementById('fullscreenArtist').textContent = track.artist;
  updatePlayButtons();
}

function renderQueue() {
  const list = document.getElementById('queueList');
  if (queue.length === 0) {
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">Queue is empty. Play something to start the queue.</div>';
    return;
  }
  list.innerHTML = queue.map((t, i) => `
    <div class="queue-item" data-index="${i}">
      <img src="${t.cover || 'logo.png'}" alt="${t.title}">
      <div class="queue-info">
        <div class="queue-title">${t.title}</div>
        <div class="queue-artist">${t.artist}</div>
      </div>
      <button class="queue-remove" data-index="${i}">✕</button>
    </div>
  `).join('');
  
  // Highlight current
  const currentItem = list.querySelector(`[data-index="${currentTrackIndex}"]`);
  if (currentItem) currentItem.style.background = '#2a0a0a';
  
  // Attach listeners
  list.querySelectorAll('.queue-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('queue-remove')) {
        playTrack(parseInt(item.dataset.index));
      }
    });
    item.querySelector('.queue-remove')?.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromQueue(parseInt(item.dataset.index));
    });
  });
}

// ============ CARD CREATION ============
function createCard(item, type) {
  const isLiked = type === 'track' && likedTracks.has(item.id);
  const heart = type === 'track' ? `<button class="track-like${isLiked ? ' liked' : ''}" data-id="${item.id}" title="${isLiked ? 'Unlike' : 'Like'}">♥</button>` : '';
  const dlBtn = type === 'track' ? `<button class="track-download" data-id="${item.id}" title="Download">⬇</button>` : '';
  
  switch (type) {
    case 'playlist':
      return `
        <div class="card" data-type="playlist" data-id="${item.id}">
          <img src="${item.cover}" alt="${item.title}">
          <div class="info">
            <div class="title">${item.title}</div>
            <div class="artist">${item.description}</div>
          </div>
        </div>
      `;
    case 'album':
      return `
        <div class="card" data-type="album" data-id="${item.id}">
          <img src="${item.cover}" alt="${item.title}">
          <div class="info">
            <div class="title">${item.title}</div>
            <div class="artist">${item.artist || item.owner}</div>
          </div>
        </div>
      `;
    case 'artist':
      return `
        <div class="card" data-type="artist" data-id="${item.id}">
          <img src="${item.image}" alt="${item.name}" style="border-radius: 50%;">
          <div class="info">
            <div class="title">${item.name}</div>
            <div class="artist">Artist</div>
          </div>
        </div>
      `;
    case 'track':
      return `
        <div class="card" data-type="track" data-id="${item.id}">
          <img src="${item.cover || 'logo.png'}" alt="${item.title}">
          <div class="info">
            <div class="title">${item.title}</div>
            <div class="artist">${item.artist}</div>
          </div>
          ${heart}${dlBtn}
        </div>
      `;
    case 'category':
      return `
        <div class="card" data-type="category" data-id="${item.id}">
          <img src="${item.cover}" alt="${item.name}">
          <div class="info">
            <div class="title">${item.name}</div>
            <div class="artist">Category</div>
          </div>
        </div>
      `;
  }
}

function createTrackRow(track, displayIndex, actualIndex, showAlbum = false) {
  const isLiked = likedTracks.has(track.id);
  const isPlayingNow = queue[currentTrackIndex]?.id === track.id && isPlaying;
  return `
    <div class="track-row${isPlayingNow ? ' playing' : ''}" data-id="${track.id}" data-index="${actualIndex}">
      <div class="track-num${isPlayingNow ? ' playing' : ''}">${displayIndex + 1}</div>
      <div class="track-main">
        <img src="logo.png" alt="${track.title}">
        <div class="track-text">
          <div class="title">${track.title}</div>
          <div class="artist">${track.artist}</div>
        </div>
      </div>
      ${showAlbum ? `<div class="track-album">${track.album}</div>` : ''}
      <div class="track-duration">${track.duration}</div>
      <button class="track-like${isLiked ? ' liked' : ''}" data-id="${track.id}" title="${isLiked ? 'Unlike' : 'Like'}">♥</button>
      <button class="track-download" data-id="${track.id}" title="Download">⬇</button>
    </div>
  `;
}

// ============ CARD LISTENERS ============
function attachCardListeners(container) {
  container.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('track-like')) return;
      if (e.target.classList.contains('track-download')) return;
      const type = card.dataset.type;
      const id = card.dataset.id;
      handleCardClick(type, id);
    });
    // Like button on track cards
    card.querySelector('.track-like')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = toTrackId(e.target.dataset.id);
      toggleLike(id);
    });
    // Download button on track cards
    card.querySelector('.track-download')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = findTrackById(e.target.dataset.id);
      downloadTrack(t, e.target);
    });
  });
}

function handleCardClick(type, id) {
  switch (type) {
    case 'playlist': navigateTo('playlistDetail', { playlistId: id }); break;
    case 'album': navigateTo('albumDetail', { albumId: id }); break;
    case 'artist': navigateTo('artistDetail', { artistId: id }); break;
    case 'track': {
      const t = findTrackById(id);
      if (!t) break;
      if (t.source === 'youtube' || t.source === 'saavn') playTrackObjects(onlineResults, onlineResults.indexOf(t));
      else openTrackModal(t);
      break;
    }
    case 'category': filterByCategory(id); break;
  }
}

function attachTrackRowListeners(container, trackIds, isLikedView = false) {
  container.querySelectorAll('.track-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('track-like')) return;
      if (e.target.classList.contains('track-download')) return;
      const index = parseInt(row.dataset.index);
      const trackIdsToPlay = isLikedView 
        ? trackList.filter(t => likedTracks.has(t.id)).map(t => t.id)
        : trackIds;
      playQueue(trackIdsToPlay, index);
    });
    row.querySelector('.track-like')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(e.target.dataset.id);
      toggleLike(id);
    });
    row.querySelector('.track-download')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = findTrackById(e.target.dataset.id);
      downloadTrack(t, e.target);
    });
  });
}

function filterByCategory(categoryId) {
  const category = categories.find(c => c.id === categoryId);
  if (!category) return;
  // For demo, just search
  document.getElementById('searchInput').value = category.name;
  navigateTo('search');
  performSearch(category.name.toLowerCase());
}

// ============ PLAYBACK QUEUE ============
function playQueue(trackIds, startIndex = 0) {
  queue = trackIds.map(id => trackList.find(t => t.id === id)).filter(Boolean);
  if (queue.length === 0) return;
  playTrack(startIndex);
  navigateTo('fullscreenNowPlaying');
  renderQueue();
}

function playPlaylist(playlistId) {
  const playlist = [...playlists, ...userPlaylists].find(p => p.id === playlistId);
  if (!playlist) return;
  playQueue(playlist.trackIds, 0);
}

function playAlbum(albumId) {
  const album = albums.find(a => a.id === albumId);
  if (!album) return;
  playQueue(album.trackIds, 0);
}

function playArtistTopTracks(artistId) {
  const tracks = trackList.filter(t => t.artistId === artistId).map(t => t.id);
  playQueue(tracks, 0);
}

function removeFromQueue(index) {
  queue.splice(index, 1);
  if (queue.length === 0) {
    audio.pause();
    isPlaying = false;
    updatePlayButtons();
    updateNowPlayingBar();
  } else if (index < currentTrackIndex) {
    currentTrackIndex--;
    if (currentTrackIndex < 0) currentTrackIndex = 0;
  } else if (index === currentTrackIndex && index >= queue.length) {
    currentTrackIndex = queue.length - 1;
    playTrack(currentTrackIndex);
  }
  renderQueue();
  updateFullscreenNowPlaying();
}

function clearQueue() {
  queue = [];
  currentTrackIndex = 0;
  audio.pause();
  isPlaying = false;
  updatePlayButtons();
  updateNowPlayingBar();
  renderQueue();
  updateFullscreenNowPlaying();
}

function toggleShuffle() {
  shuffle = !shuffle;
  document.getElementById('shuffleBtn').style.color = shuffle ? '#1DB954' : '';
  // For simplicity, not implementing full shuffle logic
}

function toggleRepeat() {
  repeat = (repeat + 1) % 3;
  const btn = document.getElementById('repeatBtn');
  btn.style.color = repeat === 0 ? '' : '#1DB954';
  const badge = document.getElementById('repeatOneBadge');
  if (badge) badge.style.display = repeat === 2 ? 'block' : 'none';
}

// Spotify-style seek bar: white played part, grey rest
function paintProgress(input, percent) {
  if (!input) return;
  const p = Math.max(0, Math.min(100, percent));
  input.style.background = `linear-gradient(90deg, #fff ${p}%, #4d4d4d ${p}%)`;
}

// ============ NOW PLAYING BAR ============
function updateNowPlayingBar() {
  if (queue.length === 0) {
    document.getElementById('nowPlayingTitle').textContent = 'Dreamy Tone';
    document.getElementById('nowPlayingArtist').textContent = 'Prabir';
    document.getElementById('nowPlayingCover').src = 'logo.png';
    document.getElementById('progressBar').value = 0;
    return;
  }
  const track = queue[currentTrackIndex];
  document.getElementById('nowPlayingTitle').textContent = track.title;
  document.getElementById('nowPlayingArtist').textContent = track.artist;
  document.getElementById('nowPlayingCover').src = track.cover || 'logo.png';
}

// ============ TRACK MODAL ============
function openTrackModal(track) {
  if (!track) return;
  document.getElementById('modalCover').src = track.cover || 'logo.png';
  document.getElementById('modalTitle').textContent = track.title;
  document.getElementById('modalArtist').textContent = track.artist;
  document.getElementById('modalDuration').textContent = track.duration;
  document.getElementById('modalProgressBar').value = 0;
  trackModal.dataset.trackId = track.id;
  trackModal.classList.add('active');
}

function closeModal() {
  trackModal.classList.remove('active');
}

function updateTrackModal(track) {
  if (!trackModal.classList.contains('active')) return;
  if (parseInt(trackModal.dataset.trackId) !== track.id) return;
  document.getElementById('modalProgressBar').value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
}

// ============ CREATE PLAYLIST ============
function openCreatePlaylistModal() {
  document.getElementById('newPlaylistName').value = '';
  document.getElementById('newPlaylistDesc').value = '';
  createPlaylistModal.classList.add('active');
}

function closeCreatePlaylistModal() {
  createPlaylistModal.classList.remove('active');
}

function createPlaylist() {
  const name = document.getElementById('newPlaylistName').value.trim();
  const desc = document.getElementById('newPlaylistDesc').value.trim();
  if (!name) return;
  
  const newPlaylist = {
    id: 'playlist_' + Date.now(),
    title: name,
    description: desc || 'Your new playlist',
    cover: 'logo.png',
    trackIds: [],
    owner: 'You'
  };
  userPlaylists.push(newPlaylist);
  closeCreatePlaylistModal();
  if (currentView === 'library') renderLibrary('playlists');
}

// ============ LIKE SYSTEM ============
function toggleLike(trackId) {
  if (likedTracks.has(trackId)) {
    likedTracks.delete(trackId);
  } else {
    likedTracks.add(trackId);
  }
  saveLikedTracks();
  updateLikeUI(trackId);
  
  // Re-render if on liked songs page
  if (currentView === 'likedSongs') renderLikedSongs();
  // Re-render search if visible
  if (currentView === 'search') renderSearch();
}

function updateLikeUI(trackId) {
  const isLiked = likedTracks.has(trackId);
  document.querySelectorAll(`.track-like[data-id="${trackId}"]`).forEach(btn => {
    btn.classList.toggle('liked', isLiked);
    btn.title = isLiked ? 'Unlike' : 'Like';
  });
}

function saveLikedTracks() {
  localStorage.setItem('shoot2head_liked', JSON.stringify([...likedTracks]));
}

function loadLikedTracks() {
  const saved = localStorage.getItem('shoot2head_liked');
  if (saved) {
    likedTracks = new Set(JSON.parse(saved));
  }
}

// ============ SAVE/FOLLOW ============
function toggleSavePlaylist(playlistId) {
  const btn = document.getElementById('playlistSave');
  const playlist = userPlaylists.find(p => p.id === playlistId);
  if (playlist) {
    // Remove from user playlists
    userPlaylists = userPlaylists.filter(p => p.id !== playlistId);
    btn.textContent = 'Save';
    btn.classList.remove('active');
  } else {
    // Add to user playlists (find from main playlists)
    const mainPlaylist = playlists.find(p => p.id === playlistId);
    if (mainPlaylist) {
      userPlaylists.push({ ...mainPlaylist });
      btn.textContent = 'Saved';
      btn.classList.add('active');
    }
  }
  if (currentView === 'library') renderLibrary('playlists');
}

function toggleSaveAlbum(albumId) {
  const btn = document.getElementById('albumSave');
  btn.classList.toggle('active');
  btn.textContent = btn.classList.contains('active') ? 'Saved' : 'Save';
}

function toggleFollowArtist(artistId) {
  const btn = document.getElementById('artistFollow');
  btn.classList.toggle('active');
  btn.textContent = btn.classList.contains('active') ? 'Following' : 'Follow';
}

// ============ HELPERS ============
function getRecentlyPlayed() {
  // For demo, return last 4 tracks from trackList
  return trackList.slice(0, 4);
}

function highlightPlayingTrack() {
  document.querySelectorAll('.track-row').forEach(row => {
    const trackId = parseInt(row.dataset.id);
    const isCurrent = queue[currentTrackIndex]?.id === trackId;
    row.classList.toggle('playing', isCurrent && isPlaying);
    row.querySelector('.track-num')?.classList.toggle('playing', isCurrent && isPlaying);
  });
}

// ============ PLAYLIST/ALBUM/ARTIST PLAY ALL ============
// Handled in event listeners