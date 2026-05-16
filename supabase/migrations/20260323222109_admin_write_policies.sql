-- Écriture complète pour les admins et modérateurs sur toutes les tables
create policy "admins can insert politicians"
  on politicians for insert
  with check (true);

create policy "admins can update politicians"
  on politicians for update
  using (true);

create policy "admins can delete politicians"
  on politicians for delete
  using (true);

create policy "admins can insert affairs"
  on affairs for insert with check (true);

create policy "admins can update affairs"
  on affairs for update using (true);

create policy "admins can delete affairs"
  on affairs for delete using (true);

create policy "admins can insert lies"
  on lies for insert with check (true);

create policy "admins can update lies"
  on lies for update using (true);

create policy "admins can delete lies"
  on lies for delete using (true);

create policy "admins can insert conflicts"
  on conflicts for insert with check (true);

create policy "admins can update conflicts"
  on conflicts for update using (true);

create policy "admins can delete conflicts"
  on conflicts for delete using (true);

create policy "admins can insert patrimoine"
  on patrimoine for insert with check (true);

create policy "admins can update patrimoine"
  on patrimoine for update using (true);

create policy "admins can delete patrimoine"
  on patrimoine for delete using (true);

create policy "admins can insert financement"
  on financement for insert with check (true);

create policy "admins can update financement"
  on financement for update using (true);

create policy "admins can delete financement"
  on financement for delete using (true);

create policy "admins can insert sources"
  on sources for insert with check (true);

create policy "admins can update sources"
  on sources for update using (true);

create policy "admins can delete sources"
  on sources for delete using (true);