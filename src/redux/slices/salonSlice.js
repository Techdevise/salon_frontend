import { createSlice } from '@reduxjs/toolkit';

const salonSlice = createSlice({
  name: 'salon',
  initialState: {
    selectedSalonId: null,
    selectedSalonInfo: null,
    salons: [],
    salonsLoaded: false, // tracks if salon list has been fetched
  },
  reducers: {
    setSalons: (state, action) => {
      state.salons = action.payload;
      state.salonsLoaded = true;
    },
    setSelectedSalon: (state, action) => {
      if (action.payload) {
        state.selectedSalonId = action.payload._id;
        state.selectedSalonInfo = action.payload;
      } else {
        state.selectedSalonId = null;
        state.selectedSalonInfo = null;
      }
    },
    clearSalon: (state) => {
      state.selectedSalonId = null;
      state.selectedSalonInfo = null;
      state.salons = [];
      state.salonsLoaded = false;
    }
  }
});

export const { setSalons, setSelectedSalon, clearSalon } = salonSlice.actions;
export default salonSlice.reducer;
