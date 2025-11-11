import React from 'react';
import { UserProfile } from '../types';

interface ProfileCardProps {
  profile: UserProfile;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gray-800">
      <img src={profile.imageUrl} alt={profile.name} className="w-full h-full object-cover" />
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 text-white flex flex-col justify-end">
        <div className="transform translate-y-2">
            <h3 className="text-3xl font-bold drop-shadow-lg">{profile.name}</h3>
            <p className="text-lg font-semibold text-gray-200 drop-shadow-md">{profile.currentPosition}</p>
            <p className="text-md text-gray-300 mb-2 drop-shadow-md">{profile.location}{profile.bairro && ` - ${profile.bairro}`}</p>
            <p className="mt-1 text-gray-200 text-sm leading-tight line-clamp-2 drop-shadow-md">{profile.bio}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
