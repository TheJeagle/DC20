// src/pages/HomePage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import './HomePage.css'; // Create this CSS file

const HomePage = ({ currentUser }) => {
    const [highlightedCreatures, setHighlightedCreatures] = useState([]);

    useEffect(() => {
        const fetchCreatures = async () => {
            try {
                const q = query(
                    collection(db, 'savedCreatures'),
                    orderBy('votes', 'desc'),
                    limit(3)
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setHighlightedCreatures(data);
            } catch (err) {
                console.error('Error fetching creatures:', err);
            }
        };
        fetchCreatures();
    }, []);

    const handleVote = async (creatureId) => {
        if (!currentUser) {
            alert('Please log in to vote.');
            return;
        }
        try {
            const creatureRef = doc(db, 'savedCreatures', creatureId);
            const voteRef = doc(db, 'savedCreatures', creatureId, 'votes', currentUser.uid);
            await setDoc(voteRef, { userId: currentUser.uid });
            await updateDoc(creatureRef, { votes: increment(1) });
            setHighlightedCreatures(prev =>
                prev.map(c =>
                    c.id === creatureId ? { ...c, votes: (c.votes || 0) + 1 } : c
                )
            );
        } catch (err) {
            console.error('Error voting:', err);
        }
    };

    return (
        <div className="homepage-container">
            <section className="hero-section">
                <h1>Welcome to the DC20 Creature Hub!</h1>
                <p className="site-purpose">
                    Your ultimate destination for creating, sharing, and discovering unique creatures
                    for your DC20 tabletop roleplaying games. Unleash your imagination and
                    bring your worlds to life!
                </p>
                <Link to="/create" className="cta-button">Start Creating Now</Link>
            </section>

            <section className="highlighted-creatures-section">
                <h2>Community Highlights</h2>
                <div className="creatures-grid">
                    {highlightedCreatures.map(creature => (
                        <div key={creature.id} className="creature-card-preview">
                            <h3>{creature.name}</h3>
                            <p>{creature.type} | {creature.role}</p>
                            <p className="submitted-by">By: {creature.submittedBy}</p>
                            <button onClick={() => handleVote(creature.id)} className="vote-button">
                                Upvote ({creature.votes || 0})
                            </button>
                            {/* <Link to={`/creatures/${creature.id}`} className="view-details-button">View Details</Link> */}
                        </div>
                    ))}
                </div>
            </section>
            {/* More sections can be added later */}
        </div>
    );
};

export default HomePage;